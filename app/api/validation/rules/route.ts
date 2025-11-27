import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import rulesEngine, { BusinessRule } from "@/lib/rules/engine"

// GET /api/validation/rules - Get all validation rules
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive")

    // Get rules from database
    const dbRules = await prisma.businessRule.findMany({
      where: {
        ...(category && { category: category as "eligibility" | "code" | "business_rule" | "document" }),
        ...(isActive !== null && { isActive: isActive === "true" }),
      },
      orderBy: { priority: "asc" },
    })

    // Merge with default rules from engine
    const engineRules = rulesEngine.getRules()

    // Combine: DB rules take precedence
    const dbRuleIds = new Set(dbRules.map((r) => r.id))
    const combinedRules = [
      ...dbRules.map((r) => ({
        ...r,
        source: "database" as const,
      })),
      ...engineRules
        .filter((r) => !dbRuleIds.has(r.id))
        .map((r) => ({
          ...r,
          source: "engine" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    ]

    return NextResponse.json(combinedRules)
  } catch (error) {
    console.error("Error fetching rules:", error)
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    )
  }
}

// POST /api/validation/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, conditions, conditionLogic, actions, priority, isActive } = body

    if (!name || !description || !category || !conditions || !actions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const rule = await prisma.businessRule.create({
      data: {
        name,
        description,
        category,
        condition: conditions,
        action: actions,
        priority: priority || 0,
        isActive: isActive !== false,
      },
    })

    // Add to rules engine
    const engineRule: BusinessRule = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category as "eligibility" | "code" | "business_rule" | "document",
      conditions: rule.condition as BusinessRule["conditions"],
      conditionLogic: conditionLogic || "and",
      actions: rule.action as BusinessRule["actions"],
      priority: rule.priority,
      isActive: rule.isActive,
    }
    rulesEngine.addRule(engineRule)

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error("Error creating rule:", error)
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    )
  }
}
