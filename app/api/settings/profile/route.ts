import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cookies } from "next/headers"

// PUT /api/settings/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, department } = body

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
        },
      })

      if (existingUser) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 400 })
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
      },
    })

    // Store department in user settings since it's not in the User model
    if (department) {
      await prisma.systemConfig.upsert({
        where: { key: `user_profile_${userId}` },
        update: {
          value: { department },
        },
        create: {
          key: `user_profile_${userId}`,
          value: { department },
        },
      })
    }

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
