import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import azureOpenAI from "@/lib/ai/azure-openai"

// GET /api/claims/[id]/ai-analysis - Get AI analysis for a claim
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") || "exceptions" // exceptions, review, or both

    // Fetch claim with related data
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        extractedFields: true,
        validationChecks: true,
        documents: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    const response: {
      exceptionAnalysis?: Awaited<ReturnType<typeof azureOpenAI.analyzeExceptions>>
      reviewSummary?: Awaited<ReturnType<typeof azureOpenAI.generateReviewSummary>>
    } = {}

    // Convert extracted fields to the format expected by AI
    const extractedFields = claim.extractedFields.map((f) => ({
      category: f.category as "patient" | "provider" | "claim" | "codes",
      label: f.label,
      value: f.value,
      confidence: f.confidence,
    }))

    // Get validation failures
    const validationFailures = claim.validationChecks
      .filter((c) => c.status === "fail" || c.status === "warning")
      .map((c) => ({
        name: c.name,
        status: c.status,
        message: c.message || undefined,
        category: c.category,
      }))

    // Exception Analysis
    if (type === "exceptions" || type === "both") {
      if (validationFailures.length > 0) {
        response.exceptionAnalysis = await azureOpenAI.analyzeExceptions(
          validationFailures,
          extractedFields,
          {
            patientName: claim.patientName || undefined,
            memberId: claim.memberId || undefined,
          }
        )
      } else {
        response.exceptionAnalysis = {
          summary: "No validation failures to analyze",
          rootCauses: [],
          suggestedFixes: [],
          riskAssessment: { denialLikelihood: "low", reasoning: "All validations passed" },
          recommendedAction: "approve_with_warning",
        }
      }
    }

    // Review Summary
    if (type === "review" || type === "both") {
      response.reviewSummary = await azureOpenAI.generateReviewSummary(
        {
          id: claim.id,
          patientName: claim.patientName || undefined,
          memberId: claim.memberId || undefined,
          status: claim.status,
          priority: claim.priority,
          receivedAt: claim.receivedAt,
        },
        extractedFields,
        claim.validationChecks.map((c) => ({
          name: c.name,
          status: c.status,
          message: c.message || undefined,
        }))
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error generating AI analysis:", error)
    return NextResponse.json(
      { error: "Failed to generate AI analysis" },
      { status: 500 }
    )
  }
}
