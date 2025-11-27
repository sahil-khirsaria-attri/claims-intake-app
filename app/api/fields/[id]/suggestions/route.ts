import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import azureOpenAI from "@/lib/ai/azure-openai"

// GET /api/fields/[id]/suggestions - Get AI suggestions for a field
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch the field
    const field = await prisma.extractedField.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            type: true,
          },
        },
        claim: {
          include: {
            extractedFields: true,
          },
        },
      },
    })

    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 })
    }

    // Get related fields for context
    const relatedFields = field.claim.extractedFields
      .filter((f) => f.id !== field.id)
      .map((f) => ({
        category: f.category as "patient" | "provider" | "claim" | "codes",
        label: f.label,
        value: f.value,
        confidence: f.confidence,
      }))

    // Generate suggestions
    const suggestions = await azureOpenAI.suggestFieldCorrections(
      {
        id: field.id,
        label: field.label,
        value: field.value,
        category: field.category,
        confidence: field.confidence,
      },
      relatedFields,
      field.document?.type || "other"
    )

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating field suggestions:", error)
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    )
  }
}
