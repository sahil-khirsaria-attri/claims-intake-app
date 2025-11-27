import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import rabbitmq, { QUEUES } from "@/lib/queue/rabbitmq"
import azureOpenAI from "@/lib/ai/azure-openai"
import { ExtractedField } from "@/lib/types"

// POST /api/claims/[id]/submit - Submit a claim
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, comment } = body

    // Get claim with all related data
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        extractedFields: true,
        validationChecks: true,
        documents: true,
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    // Check if claim can be submitted
    const hasFailedValidations = claim.validationChecks.some((c) => c.status === "fail")
    if (hasFailedValidations && !body.force) {
      return NextResponse.json(
        { error: "Claim has failed validations. Use force=true to submit anyway." },
        { status: 400 }
      )
    }

    // Generate EDI content if not exists
    let ediContent = claim.ediContent
    if (!ediContent) {
      try {
        const fields: ExtractedField[] = claim.extractedFields.map((f) => ({
          id: f.id,
          category: f.category as "patient" | "provider" | "claim" | "codes",
          label: f.label,
          value: f.value,
          confidence: f.confidence,
          isEdited: f.isEdited,
        }))
        ediContent = await azureOpenAI.generateEDI837(fields)
      } catch (error) {
        console.error("Failed to generate EDI:", error)
        ediContent = "EDI generation failed - manual submission required"
      }
    }

    // Generate confirmation number
    const confirmationNumber = `CLM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Update claim
    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        confirmationNumber,
        ediContent,
      },
    })

    // Create payer tracking
    await prisma.payerTracking.create({
      data: {
        claimId: id,
        status: "pending",
        payerName: claim.extractedFields.find((f) => f.label === "Payer Name")?.value || "Unknown Payer",
        payerId: claim.extractedFields.find((f) => f.label === "Payer ID")?.value || "UNKNOWN",
        trackingEvents: {
          create: {
            status: "submitted",
            description: "Claim submitted to payer",
          },
        },
      },
    })

    // Add audit log
    await prisma.auditLogEntry.create({
      data: {
        claimId: id,
        userId: userId || "system",
        action: "Claim submitted",
        details: comment || `Confirmation #: ${confirmationNumber}`,
      },
    })

    // Queue submission notification
    await rabbitmq.publish(QUEUES.NOTIFICATION, {
      type: QUEUES.NOTIFICATION,
      payload: {
        type: "claim_submitted",
        claimId: id,
        confirmationNumber,
        userId,
      },
      claimId: id,
    })

    // Invalidate cache
    await cache.del(cache.claimKey(id))
    await cache.invalidatePattern("claims:list:*")

    return NextResponse.json({
      success: true,
      confirmationNumber,
      submittedAt: updatedClaim.submittedAt,
      ediGenerated: !!ediContent,
    })
  } catch (error) {
    console.error("Error submitting claim:", error)
    return NextResponse.json(
      { error: "Failed to submit claim" },
      { status: 500 }
    )
  }
}
