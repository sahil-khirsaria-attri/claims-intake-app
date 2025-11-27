import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import jwt from "jsonwebtoken"

// GET /api/auth/me - Get current user
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const token =
      request.cookies.get("token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Verify token
    let decoded: { userId: string; email: string; role: string }
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default-secret"
      ) as { userId: string; email: string; role: string }
    } catch {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "User not found or deactivated" },
        { status: 401 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error getting current user:", error)
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    )
  }
}
