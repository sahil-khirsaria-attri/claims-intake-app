import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import { claimProcessor } from "@/lib/services/claim-processor"

// POST /api/claims/[id]/process - Process a claim through full validation pipeline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify claim exists
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        documents: true,
        extractedFields: true,
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    // Check if claim has extracted fields (documents need to be processed first)
    if (claim.extractedFields.length === 0) {
      return NextResponse.json(
        {
          error: "No extracted fields found",
          message: "Please upload and process documents before running validation",
        },
        { status: 400 }
      )
    }

    // Run the full claim processing pipeline
    const result = await claimProcessor.process(id)

    // Invalidate cache
    await cache.del(cache.claimKey(id))

    if (result.status === "error") {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          claimId: id,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      claimId: id,
      eligibility: {
        status: result.eligibility.overallStatus,
        passed: result.eligibility.checks.filter((c) => c.status === "PASS").length,
        warnings: result.eligibility.checks.filter((c) => c.status === "WARNING").length,
        failed: result.eligibility.checks.filter((c) => c.status === "FAIL").length,
        checks: result.eligibility.checks,
      },
      codeValidation: {
        status: result.codeValidation.overallStatus,
        passed: result.codeValidation.checks.filter((c) => c.status === "PASS").length,
        warnings: result.codeValidation.checks.filter((c) => c.status === "WARNING").length,
        failed: result.codeValidation.checks.filter((c) => c.status === "FAIL").length,
        checks: result.codeValidation.checks,
      },
      documentCheck: {
        status: result.documentCheck.status,
        required: result.documentCheck.requiredDocuments.length,
        received: result.documentCheck.receivedDocuments.length,
        missing: result.documentCheck.missingDocuments,
      },
      businessRules: {
        status: result.businessRules.overallStatus,
        checks: result.businessRules.checks,
      },
      routing: {
        queue: result.routingDecision.queue,
        action: result.routingDecision.action,
        priority: result.routingDecision.priority,
        reason: result.routingDecision.reason,
        confidenceScore: result.routingDecision.confidenceScore,
        issuesToResolve: result.routingDecision.issuesToResolve,
        autoCorrections: result.routingDecision.autoCorrections,
        estimatedResolutionTime: result.routingDecision.estimatedResolutionTime,
      },
      validationChecksSaved: result.validationChecksSaved,
    })
  } catch (error) {
    console.error("Error processing claim:", error)
    return NextResponse.json(
      { error: "Failed to process claim" },
      { status: 500 }
    )
  }
}
