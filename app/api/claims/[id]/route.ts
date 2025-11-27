import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"

// GET /api/claims/[id] - Get a single claim
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check cache
    const cacheKey = cache.claimKey(id)
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const claim = await prisma.claim.findUnique({
      where: { id },
      include: {
        assignee: true,
        documents: true,
        extractedFields: {
          orderBy: { category: "asc" },
        },
        validationChecks: {
          orderBy: { category: "asc" },
        },
        auditLog: {
          include: { user: true },
          orderBy: { timestamp: "desc" },
        },
        payerTracking: {
          include: { trackingEvents: { orderBy: { timestamp: "desc" } } },
        },
      },
    })

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 })
    }

    // Cache for 60 seconds
    await cache.set(cacheKey, claim, 60)

    return NextResponse.json(claim)
  } catch (error) {
    console.error("Error fetching claim:", error)
    return NextResponse.json(
      { error: "Failed to fetch claim" },
      { status: 500 }
    )
  }
}

// PATCH /api/claims/[id] - Update a claim
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const claim = await prisma.claim.update({
      where: { id },
      data: body,
      include: {
        assignee: true,
        documents: true,
        extractedFields: true,
        validationChecks: true,
      },
    })

    // Invalidate cache
    await cache.del(cache.claimKey(id))
    await cache.invalidatePattern("claims:list:*")

    return NextResponse.json(claim)
  } catch (error) {
    console.error("Error updating claim:", error)
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 }
    )
  }
}

// DELETE /api/claims/[id] - Delete a claim
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.claim.delete({
      where: { id },
    })

    // Invalidate cache
    await cache.del(cache.claimKey(id))
    await cache.invalidatePattern("claims:list:*")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting claim:", error)
    return NextResponse.json(
      { error: "Failed to delete claim" },
      { status: 500 }
    )
  }
}
