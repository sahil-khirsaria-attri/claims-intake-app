import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"

// PATCH /api/fields/[id] - Update an extracted field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { value } = body

    if (typeof value !== "string") {
      return NextResponse.json({ error: "Value is required" }, { status: 400 })
    }

    // Find the field to get the claimId
    const existingField = await prisma.extractedField.findUnique({
      where: { id },
    })

    if (!existingField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    // Update the field
    const field = await prisma.extractedField.update({
      where: { id },
      data: {
        value,
        isEdited: true,
      },
    })

    // Add audit log entry
    await prisma.auditLogEntry.create({
      data: {
        claimId: existingField.claimId,
        userId: "system",
        action: "Field edited",
        details: `${existingField.label}: "${existingField.value}" → "${value}"`,
      },
    })

    // Invalidate cache
    await cache.del(cache.claimKey(existingField.claimId))

    return NextResponse.json(field)
  } catch (error) {
    console.error("Error updating field:", error)
    return NextResponse.json(
      { error: "Failed to update field" },
      { status: 500 }
    )
  }
}

// DELETE /api/fields/[id] - Delete an extracted field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find the field to get the claimId
    const existingField = await prisma.extractedField.findUnique({
      where: { id },
    })

    if (!existingField) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    // Delete the field
    await prisma.extractedField.delete({
      where: { id },
    })

    // Add audit log entry
    await prisma.auditLogEntry.create({
      data: {
        claimId: existingField.claimId,
        userId: "system",
        action: "Field deleted",
        details: `Deleted field: ${existingField.label}`,
      },
    })

    // Invalidate cache
    await cache.del(cache.claimKey(existingField.claimId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting field:", error)
    return NextResponse.json(
      { error: "Failed to delete field" },
      { status: 500 }
    )
  }
}
