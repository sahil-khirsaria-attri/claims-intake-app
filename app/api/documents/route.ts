import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { put } from "@vercel/blob"
import { extractTextFromPDF, extractTextFromPDFBuffer } from "@/lib/ocr/pdf-extract"
import azureOpenAI from "@/lib/ai/azure-openai"

// Check if we're running on Vercel (production) or locally
const isVercel = !!process.env.VERCEL || !!process.env.BLOB_READ_WRITE_TOKEN

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const claimId = searchParams.get("claimId")
    const ocrStatus = searchParams.get("ocrStatus")

    const where: { claimId?: string; ocrStatus?: "pending" | "processing" | "complete" | "failed" } = {}

    if (claimId) where.claimId = claimId
    if (ocrStatus) where.ocrStatus = ocrStatus as "pending" | "processing" | "complete" | "failed"

    const documents = await prisma.document.findMany({
      where,
      include: {
        claim: {
          select: {
            id: true,
            patientName: true,
            status: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

// Valid document types
const validDocumentTypes = ["cms_1500", "ub_04", "operative_notes", "h_and_p", "prior_auth", "referral", "medical_records", "other"] as const
type ValidDocumentType = typeof validDocumentTypes[number]

// POST /api/documents - Upload a document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const claimId = formData.get("claimId") as string
    const rawType = formData.get("type") as string || "other"

    // Validate and normalize document type
    const documentType: ValidDocumentType = validDocumentTypes.includes(rawType as ValidDocumentType)
      ? rawType as ValidDocumentType
      : "other"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 })
    }

    // Verify claim exists
    const claim = await prisma.claim.findUnique({ where: { id: claimId } })
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    // Get file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`

    let fileUrl: string

    // Store file - use Vercel Blob in production, local filesystem in development
    if (isVercel) {
      // Use Vercel Blob for production
      const blob = await put(`claims/${claimId}/${fileName}`, buffer, {
        access: "public",
        contentType: file.type,
      })
      fileUrl = blob.url
    } else {
      // Use local filesystem for development
      const uploadDir = process.env.UPLOAD_DIR || "./uploads"
      const claimDir = path.join(uploadDir, claimId)
      await mkdir(claimDir, { recursive: true })
      const filePath = path.join(claimDir, fileName)
      await writeFile(filePath, buffer)
      fileUrl = filePath
    }

    // Extract text if it's a PDF
    let extractedText: string | null = null
    let ocrStatus: "pending" | "processing" | "complete" | "failed" = "pending"
    let qualityScore = 0

    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        // Use buffer-based extraction for Vercel, file-based for local
        const pdfResult = isVercel
          ? await extractTextFromPDFBuffer(buffer)
          : await extractTextFromPDF(fileUrl)
        extractedText = pdfResult.text
        ocrStatus = "complete"
        // Calculate quality score based on text length and content
        qualityScore = extractedText.length > 100 ? 85 : extractedText.length > 50 ? 70 : 50
      } catch (error) {
        console.error("PDF text extraction failed:", error)
        ocrStatus = "failed"
      }
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        claimId,
        name: file.name,
        type: documentType,
        url: fileUrl,
        ocrStatus,
        rawOcrText: extractedText,
        classificationConfidence: 0,
        qualityScore,
        processedAt: extractedText ? new Date() : null,
      },
    })

    // Extract structured fields using Azure OpenAI if we have text
    let extractedFieldsCount = 0
    if (extractedText && extractedText.length > 10) {
      try {
        const aiResult = await azureOpenAI.extractFields(extractedText, documentType)

        // Save extracted fields to database
        for (const field of aiResult.fields) {
          await prisma.extractedField.create({
            data: {
              claimId,
              documentId: document.id,
              category: field.category as "patient" | "provider" | "claim" | "codes",
              label: field.label,
              value: field.value,
              confidence: field.confidence,
            },
          })
        }
        extractedFieldsCount = aiResult.fields.length

        // Update document classification confidence
        await prisma.document.update({
          where: { id: document.id },
          data: { classificationConfidence: aiResult.confidence },
        })

        // Update claim with patient info if available
        const patientName = aiResult.fields.find((f) => f.label.toLowerCase().includes("patient name"))?.value
        const memberId = aiResult.fields.find((f) => f.label.toLowerCase().includes("member id") || f.label.toLowerCase().includes("insurance id"))?.value
        const avgConfidence = aiResult.fields.reduce((sum, f) => sum + f.confidence, 0) / aiResult.fields.length

        await prisma.claim.update({
          where: { id: claimId },
          data: {
            confidenceScore: avgConfidence,
            ...(patientName && { patientName }),
            ...(memberId && { memberId }),
          },
        })
      } catch (error) {
        console.error("AI field extraction failed:", error)
        // Continue without AI extraction - not a fatal error
      }
    }

    // Invalidate cache
    await cache.del(cache.claimKey(claimId))

    return NextResponse.json({ ...document, extractedFieldsCount }, { status: 201 })
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    )
  }
}
