import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { cookies } from "next/headers"

export interface Integration {
  id: string
  name: string
  description: string
  type: "clearinghouse" | "ehr" | "payer" | "analytics"
  status: "connected" | "disconnected" | "pending"
  lastSync?: string
  config?: Record<string, string>
}

// Default integrations available
const defaultIntegrations: Integration[] = [
  {
    id: "availity",
    name: "Availity",
    description: "Real-time eligibility verification and claims submission",
    type: "clearinghouse",
    status: "disconnected",
  },
  {
    id: "change-healthcare",
    name: "Change Healthcare",
    description: "Claims processing and revenue cycle management",
    type: "clearinghouse",
    status: "disconnected",
  },
  {
    id: "epic",
    name: "Epic EHR",
    description: "Electronic health records integration",
    type: "ehr",
    status: "disconnected",
  },
  {
    id: "cerner",
    name: "Oracle Cerner",
    description: "Clinical data and patient records",
    type: "ehr",
    status: "disconnected",
  },
  {
    id: "bcbs",
    name: "Blue Cross Blue Shield",
    description: "Direct payer connection for BCBS claims",
    type: "payer",
    status: "disconnected",
  },
  {
    id: "aetna",
    name: "Aetna",
    description: "Direct payer connection for Aetna claims",
    type: "payer",
    status: "disconnected",
  },
]

// GET /api/settings/integrations - Get all integrations
export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get stored integration configs
    const storedConfig = await prisma.systemConfig.findUnique({
      where: { key: "integrations" },
    })

    const storedIntegrations = (storedConfig?.value as Record<string, Partial<Integration>>) || {}

    // Merge default integrations with stored config
    const integrations = defaultIntegrations.map((integration) => ({
      ...integration,
      ...(storedIntegrations[integration.id] || {}),
    }))

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

// PUT /api/settings/integrations/:id - Update integration
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get("userId")?.value

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { integrationId, action, config } = body

    if (!integrationId) {
      return NextResponse.json({ error: "Integration ID is required" }, { status: 400 })
    }

    // Get current integrations config
    const storedConfig = await prisma.systemConfig.findUnique({
      where: { key: "integrations" },
    })

    const integrations = (storedConfig?.value as Record<string, Partial<Integration>>) || {}

    // Update the specific integration
    if (action === "connect") {
      integrations[integrationId] = {
        status: "connected",
        lastSync: new Date().toISOString(),
        config: config || {},
      }
    } else if (action === "disconnect") {
      integrations[integrationId] = {
        status: "disconnected",
        config: {},
      }
    } else if (action === "test") {
      // Simulate testing connection
      return NextResponse.json({
        success: true,
        message: "Connection test successful",
        integrationId,
      })
    }

    // Save updated config
    await prisma.systemConfig.upsert({
      where: { key: "integrations" },
      update: { value: integrations },
      create: { key: "integrations", value: integrations },
    })

    return NextResponse.json({
      success: true,
      integration: {
        ...defaultIntegrations.find((i) => i.id === integrationId),
        ...integrations[integrationId],
      },
    })
  } catch (error) {
    console.error("Error updating integration:", error)
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 })
  }
}
