import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import { unlink } from "fs/promises"

// GET /api/documents/[id] - Get a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        claim: true,
        extractedFields: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete file
    try {
      await unlink(document.url)
    } catch (error) {
      console.error("Error deleting file:", error)
    }

    // Delete record
    await prisma.document.delete({
      where: { id },
    })

    // Note: Audit log requires a valid user ID. Skipping for system operations.

    // Invalidate cache
    await cache.del(cache.claimKey(document.claimId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
