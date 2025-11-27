import { NextRequest, NextResponse } from "next/server"

// POST /api/auth/logout - Logout
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    // Clear cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("Error during logout:", error)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}
