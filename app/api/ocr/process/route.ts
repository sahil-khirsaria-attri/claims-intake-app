import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import tesseract from "@/lib/ocr/tesseract"
import azureOpenAI from "@/lib/ai/azure-openai"

// POST /api/ocr/process - Process a document with OCR and AI extraction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId } = body

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 })
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { claim: true },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "processing" },
    })

    try {
      // Run OCR
      const ocrResult = await tesseract.processImage(document.url)

      // Assess document quality
      const quality = await tesseract.assessQuality(document.url)

      // Detect document type
      const documentType = await tesseract.detectFormType(document.url)

      // Update document with OCR results
      await prisma.document.update({
        where: { id: documentId },
        data: {
          ocrStatus: "complete",
          rawOcrText: ocrResult.text,
          qualityScore: quality.score,
          classificationConfidence: documentType.confidence,
          type: documentType.type as "cms_1500" | "ub_04" | "operative_notes" | "h_and_p" | "prior_auth" | "referral" | "medical_records" | "other",
          processedAt: new Date(),
        },
      })

      // Extract fields using Claude AI
      let extractedFields: { category: string; label: string; value: string; confidence: number }[] = []
      try {
        const aiResult = await azureOpenAI.extractFields(ocrResult.text, documentType.type)
        extractedFields = aiResult.fields

        // Save extracted fields
        for (const field of extractedFields) {
          await prisma.extractedField.create({
            data: {
              claimId: document.claimId,
              documentId: documentId,
              category: field.category as "patient" | "provider" | "claim" | "codes",
              label: field.label,
              value: field.value,
              confidence: field.confidence,
            },
          })
        }

        // Update claim confidence score
        const avgConfidence =
          extractedFields.reduce((sum, f) => sum + f.confidence, 0) / extractedFields.length

        await prisma.claim.update({
          where: { id: document.claimId },
          data: {
            confidenceScore: avgConfidence,
            patientName: extractedFields.find((f) => f.label === "Patient Name")?.value,
            memberId: extractedFields.find((f) => f.label === "Member ID")?.value,
          },
        })
      } catch (error) {
        console.error("AI extraction error:", error)
        // Continue without AI extraction
      }

      // Add audit log
      await prisma.auditLogEntry.create({
        data: {
          claimId: document.claimId,
          userId: "system",
          action: "OCR processing completed",
          details: `Document: ${document.name}, Quality: ${quality.score}%, Fields extracted: ${extractedFields.length}`,
        },
      })

      // Invalidate cache
      await cache.del(cache.claimKey(document.claimId))

      return NextResponse.json({
        success: true,
        documentId,
        ocrConfidence: ocrResult.confidence,
        qualityScore: quality.score,
        documentType: documentType.type,
        fieldsExtracted: extractedFields.length,
        qualityIssues: quality.issues,
      })
    } catch (error) {
      // Mark as failed
      await prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: "failed" },
      })

      throw error
    }
  } catch (error) {
    console.error("Error processing document:", error)
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    )
  }
}
