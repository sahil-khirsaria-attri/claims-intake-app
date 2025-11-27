import { NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"

// GET /api/claims/counts - Get claim counts for sidebar badges
export async function GET() {
  try {
    // Count claims in inbox (new, processing, validation_pending, validation_complete)
    const inboxCount = await prisma.claim.count({
      where: {
        status: {
          in: ["new", "processing", "validation_pending", "validation_complete"],
        },
      },
    })

    // Count claims needing human review
    const reviewCount = await prisma.claim.count({
      where: {
        status: "human_review",
      },
    })

    // Count claims in exception queue
    const exceptionsCount = await prisma.claim.count({
      where: {
        status: "exception",
      },
    })

    return NextResponse.json({
      inbox: inboxCount,
      review: reviewCount,
      exceptions: exceptionsCount,
    })
  } catch (error) {
    console.error("Error fetching claim counts:", error)
    return NextResponse.json(
      { inbox: 0, review: 0, exceptions: 0 },
      { status: 500 }
    )
  }
}
