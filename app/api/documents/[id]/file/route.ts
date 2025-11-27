import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { readFile } from "fs/promises"
import path from "path"

// Check if URL is a Vercel Blob URL or other external URL
function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

// GET /api/documents/[id]/file - Serve the actual document file
export async function GET(
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

    // If the URL is external (Vercel Blob or other cloud storage), redirect to it
    if (isExternalUrl(document.url)) {
      return NextResponse.redirect(document.url)
    }

    // For local files, read and serve them
    const filePath = document.url
    let fileBuffer: Buffer

    try {
      fileBuffer = await readFile(filePath)
    } catch (error) {
      console.error("Error reading file:", error)
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }

    // Determine content type based on file extension
    const ext = path.extname(document.name).toLowerCase()
    let contentType = "application/octet-stream"

    switch (ext) {
      case ".pdf":
        contentType = "application/pdf"
        break
      case ".png":
        contentType = "image/png"
        break
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg"
        break
      case ".gif":
        contentType = "image/gif"
        break
      case ".webp":
        contentType = "image/webp"
        break
      case ".tiff":
      case ".tif":
        contentType = "image/tiff"
        break
    }

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${document.name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error serving document:", error)
    return NextResponse.json(
      { error: "Failed to serve document" },
      { status: 500 }
    )
  }
}
