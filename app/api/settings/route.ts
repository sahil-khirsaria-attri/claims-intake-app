import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cookies } from "next/headers"

// GET /api/settings - Get user settings
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user-specific settings
    const userSettings = await prisma.systemConfig.findUnique({
      where: { key: `user_settings_${userId}` },
    })

    // Get global settings
    const globalSettings = await prisma.systemConfig.findUnique({
      where: { key: "global_settings" },
    })

    return NextResponse.json({
      ...(globalSettings?.value as object || {}),
      ...(userSettings?.value as object || {}),
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notifications, validation } = body

    // Upsert user settings
    await prisma.systemConfig.upsert({
      where: { key: `user_settings_${userId}` },
      update: {
        value: { notifications, validation },
      },
      create: {
        key: `user_settings_${userId}`,
        value: { notifications, validation },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
