import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cache } from "@/lib/db/redis"
import { Prisma } from "@prisma/client"

// GET /api/claims - List claims with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const assigneeId = searchParams.get("assigneeId")
    const channel = searchParams.get("channel")
    const dateRange = searchParams.get("dateRange")
    const search = searchParams.get("search")
    const sortBy = searchParams.get("sortBy") || "receivedAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    // Build cache key
    const cacheKey = cache.claimsListKey(
      JSON.stringify({ page, limit, status, priority, assigneeId, channel, dateRange, search, sortBy, sortOrder })
    )

    // Check cache
    const cached = await cache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Build where clause
    const where: Prisma.ClaimWhereInput = {}

    if (status) {
      where.status = status as Prisma.EnumClaimStatusFilter["equals"]
    }

    if (priority) {
      where.priority = priority as Prisma.EnumPriorityFilter["equals"]
    }

    if (assigneeId) {
      if (assigneeId === "null") {
        where.assigneeId = null
      } else {
        where.assigneeId = assigneeId
      }
    }

    if (channel) {
      where.submissionChannel = channel as Prisma.EnumSubmissionChannelFilter["equals"]
    }

    // Date range filter
    if (dateRange) {
      const now = new Date()
      let startDate: Date | undefined

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
      }

      if (startDate) {
        where.receivedAt = { gte: startDate }
      }
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { patientName: { contains: search, mode: "insensitive" } },
        { memberId: { contains: search, mode: "insensitive" } },
      ]
    }

    // Get total count
    const total = await prisma.claim.count({ where })

    // Get claims
    const claims = await prisma.claim.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
            ocrStatus: true,
          },
        },
        validationChecks: {
          select: {
            id: true,
            category: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            extractedFields: true,
            auditLog: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    const result = {
      data: claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Cache for 30 seconds
    await cache.set(cacheKey, result, 30)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching claims:", error)
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    )
  }
}

// POST /api/claims - Create a new claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { submissionChannel, priority, patientName, memberId, assigneeId } = body

    const claim = await prisma.claim.create({
      data: {
        submissionChannel: submissionChannel || "portal",
        priority: priority || "medium",
        patientName,
        memberId,
        assigneeId,
        status: "new",
        confidenceScore: 0,
      },
      include: {
        assignee: true,
      },
    })

    // Invalidate list cache
    await cache.invalidatePattern("claims:list:*")

    return NextResponse.json(claim, { status: 201 })
  } catch (error) {
    console.error("Error creating claim:", error)
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    )
  }
}
