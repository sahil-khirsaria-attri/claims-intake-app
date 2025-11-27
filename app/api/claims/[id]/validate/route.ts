import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import rulesEngine from "@/lib/rules/engine"
import { ExtractedField } from "@/lib/types"

// POST /api/claims/[id]/validate - Run validation on a claim
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get claim with extracted fields
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        extractedFields: true,
        documents: true,
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    // Convert Prisma fields to rule engine format
    const fields: ExtractedField[] = claim.extractedFields.map((f) => ({
      id: f.id,
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
      isEdited: f.isEdited,
    }))

    // Build context for rules engine
    const context = {
      fields,
      documentType: claim.documents[0]?.type,
      claimAmount: claim.totalAmount ?? undefined,
      dateOfService: claim.extractedFields.find((f) => f.label === "Date of Service")?.value,
      metadata: {
        qualityScore: claim.documents.reduce((sum, d) => sum + d.qualityScore, 0) / claim.documents.length,
        hasOperativeNotes: claim.documents.some((d) => d.type === "operative_notes").toString(),
      },
    }

    // Execute all rules
    const results = rulesEngine.execute(context)

    // Clear existing validation checks and create new ones
    await prisma.validationCheck.deleteMany({
      where: { claimId: id },
    })

    const validationChecks = await prisma.validationCheck.createManyAndReturn({
      data: results.map((r) => ({
        claimId: id,
        category: r.validationCheck.category as "eligibility" | "code" | "business_rule" | "document",
        name: r.validationCheck.name,
        description: r.validationCheck.description,
        status: r.validationCheck.status as "pass" | "warning" | "fail" | "pending",
        details: r.validationCheck.details,
        ruleId: r.ruleId,
        executedAt: new Date(),
      })),
    })

    // Determine overall status
    const hasFailed = results.some((r) => r.validationCheck.status === "fail")
    const hasWarning = results.some((r) => r.validationCheck.status === "warning")

    let newStatus = claim.status
    if (hasFailed) {
      newStatus = "exception"
    } else if (hasWarning) {
      newStatus = "human_review"
    } else {
      newStatus = "validation_complete"
    }

    // Update claim status and confidence
    const passedCount = results.filter((r) => r.passed).length
    const confidenceScore = (passedCount / results.length) * 100

    await prisma.claim.update({
      where: { id },
      data: {
        status: newStatus,
        confidenceScore,
      },
    })

    // Add audit log
    await prisma.auditLogEntry.create({
      data: {
        claimId: id,
        userId: "system",
        action: "Validation completed",
        details: `${results.length} rules executed. Status: ${newStatus}`,
      },
    })

    // Invalidate cache
    await cache.del(cache.claimKey(id))
    await cache.invalidatePattern("claims:list:*")

    return NextResponse.json({
      success: true,
      results: validationChecks,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.filter((r) => r.validationCheck.status === "fail").length,
        warnings: results.filter((r) => r.validationCheck.status === "warning").length,
        newStatus,
        confidenceScore,
      },
    })
  } catch (error) {
    console.error("Error validating claim:", error)
    return NextResponse.json(
      { error: "Failed to validate claim" },
      { status: 500 }
    )
  }
}
