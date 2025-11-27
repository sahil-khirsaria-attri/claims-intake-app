import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"

// GET /api/metrics - Get dashboard metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateRange = searchParams.get("range") || "7d"

    // Check cache
    const cacheKey = cache.metricsKey(dateRange)
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "ytd":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    // Get claim counts by status
    const statusCounts = await prisma.claim.groupBy({
      by: ["status"],
      where: {
        receivedAt: { gte: startDate },
      },
      _count: true,
    })

    // Get total claims
    const totalClaims = statusCounts.reduce((sum, s) => sum + s._count, 0)

    // Calculate metrics
    const newClaims = statusCounts.find((s) => s.status === "new")?._count || 0
    const processing =
      (statusCounts.find((s) => s.status === "processing")?._count || 0) +
      (statusCounts.find((s) => s.status === "validation_pending")?._count || 0)
    const exceptions = statusCounts.find((s) => s.status === "exception")?._count || 0
    const humanReview = statusCounts.find((s) => s.status === "human_review")?._count || 0
    const submitted = statusCounts.find((s) => s.status === "submitted")?._count || 0

    // Get average processing time (for submitted claims)
    const submittedClaims = await prisma.claim.findMany({
      where: {
        status: "submitted",
        submittedAt: { not: null },
        receivedAt: { gte: startDate },
      },
      select: {
        receivedAt: true,
        submittedAt: true,
      },
    })

    let avgProcessingTime = "0h"
    if (submittedClaims.length > 0) {
      const totalMs = submittedClaims.reduce((sum, c) => {
        if (c.submittedAt) {
          return sum + (c.submittedAt.getTime() - c.receivedAt.getTime())
        }
        return sum
      }, 0)
      const avgMs = totalMs / submittedClaims.length
      const avgHours = Math.round(avgMs / (1000 * 60 * 60) * 10) / 10
      avgProcessingTime = `${avgHours}h`
    }

    // Calculate exception rate
    const exceptionRate =
      totalClaims > 0 ? Math.round((exceptions / totalClaims) * 100 * 10) / 10 : 0

    // Get claims over time (daily)
    const claimsOverTime = await prisma.$queryRaw<
      { date: Date; count: bigint }[]
    >`
      SELECT DATE("receivedAt") as date, COUNT(*) as count
      FROM "Claim"
      WHERE "receivedAt" >= ${startDate}
      GROUP BY DATE("receivedAt")
      ORDER BY date ASC
    `

    // Get user performance
    const userPerformance = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["validation_specialist", "human_reviewer"] },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assignedClaims: {
              where: {
                status: "submitted",
                receivedAt: { gte: startDate },
              },
            },
          },
        },
      },
      orderBy: {
        assignedClaims: {
          _count: "desc",
        },
      },
      take: 10,
    })

    const metrics = {
      totalClaims,
      newClaims,
      inProgress: processing,
      exceptions,
      humanReview,
      submitted,
      avgProcessingTime,
      exceptionRate,
      statusDistribution: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      claimsOverTime: claimsOverTime.map((c) => ({
        date: c.date,
        count: Number(c.count),
      })),
      userPerformance: userPerformance.map((u) => ({
        userId: u.id,
        name: u.name,
        processed: u._count.assignedClaims,
      })),
    }

    // Cache for 1 minute
    await cache.set(cacheKey, metrics, 60)

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Error fetching metrics:", error)
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    )
  }
}
