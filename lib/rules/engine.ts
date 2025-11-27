import { ValidationCheck, ExtractedField } from "@/lib/types"

// Rule condition types
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "in_list"
  | "not_in_list"
  | "regex"
  | "is_empty"
  | "is_not_empty"
  | "is_valid_npi"
  | "is_valid_date"
  | "is_valid_icd10"
  | "is_valid_cpt"

export interface RuleCondition {
  field: string // Field path like "patient.dob" or field label
  operator: ConditionOperator
  value?: string | number | string[]
  caseSensitive?: boolean
}

export interface RuleAction {
  type: "pass" | "fail" | "warning" | "set_value" | "require_field"
  message?: string
  targetField?: string
  value?: string
}

export interface BusinessRule {
  id: string
  name: string
  description: string
  category: "eligibility" | "code" | "business_rule" | "document"
  conditions: RuleCondition[]
  conditionLogic: "and" | "or"
  actions: RuleAction[]
  priority: number
  isActive: boolean
}

export interface RuleExecutionContext {
  fields: ExtractedField[]
  documentType?: string
  claimAmount?: number
  dateOfService?: string
  metadata?: Record<string, unknown>
}

export interface RuleResult {
  ruleId: string
  ruleName: string
  passed: boolean
  validationCheck: ValidationCheck
}

class RulesEngine {
  private rules: BusinessRule[] = []

  constructor() {
    // Initialize with default rules
    this.rules = this.getDefaultRules()
  }

  getDefaultRules(): BusinessRule[] {
    return [
      // Eligibility Rules
      {
        id: "elig-001",
        name: "Member ID Required",
        description: "Member ID must be present for claims processing",
        category: "eligibility",
        conditions: [{ field: "Member ID", operator: "is_not_empty" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Member ID is present" },
          { type: "fail", message: "Member ID is missing - required for eligibility verification" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "elig-002",
        name: "Valid Insurance ID Format",
        description: "Insurance ID should follow standard format",
        category: "eligibility",
        conditions: [{ field: "Insurance ID", operator: "regex", value: "^[A-Z0-9]{9,15}$" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Insurance ID format is valid" },
          { type: "warning", message: "Insurance ID format may be invalid - verify with payer" },
        ],
        priority: 2,
        isActive: true,
      },

      // Code Validation Rules
      {
        id: "code-001",
        name: "Valid NPI Format",
        description: "Provider NPI must be 10 digits",
        category: "code",
        conditions: [{ field: "Provider NPI", operator: "is_valid_npi" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Provider NPI is valid" },
          { type: "fail", message: "Invalid NPI format - must be 10 digits" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "code-002",
        name: "Valid ICD-10 Diagnosis Code",
        description: "Diagnosis codes must be valid ICD-10 format",
        category: "code",
        conditions: [{ field: "Diagnosis Code", operator: "is_valid_icd10" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Diagnosis code format is valid" },
          { type: "fail", message: "Invalid ICD-10 diagnosis code format" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "code-003",
        name: "Valid CPT Code",
        description: "Procedure codes must be valid CPT format",
        category: "code",
        conditions: [{ field: "CPT Code", operator: "is_valid_cpt" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "CPT code format is valid" },
          { type: "warning", message: "CPT code format may be invalid - verify procedure code" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "code-004",
        name: "Code Bundling Check",
        description: "Check for commonly bundled procedure codes",
        category: "code",
        conditions: [{ field: "CPT Codes", operator: "contains", value: "99213,99214" }],
        conditionLogic: "and",
        actions: [
          { type: "warning", message: "Potential code bundling issue - 99213 and 99214 may not be billable together" },
        ],
        priority: 2,
        isActive: true,
      },

      // Business Rules
      {
        id: "biz-001",
        name: "Date of Service Validation",
        description: "Date of service cannot be in the future",
        category: "business_rule",
        conditions: [{ field: "Date of Service", operator: "is_valid_date" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Date of service is valid" },
          { type: "fail", message: "Invalid or future date of service" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "biz-002",
        name: "Timely Filing Check",
        description: "Claims must be submitted within filing deadline",
        category: "business_rule",
        conditions: [{ field: "Date of Service", operator: "is_valid_date" }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Within timely filing limits" },
          { type: "warning", message: "Claim may be approaching timely filing deadline" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "biz-003",
        name: "Referring Provider Required",
        description: "Specialist consultations require referring provider",
        category: "business_rule",
        conditions: [
          { field: "Place of Service", operator: "in_list", value: ["11", "22"] },
          { field: "Referring Provider NPI", operator: "is_empty" },
        ],
        conditionLogic: "and",
        actions: [
          { type: "warning", message: "Missing referring provider NPI - may be required for specialist consultations" },
        ],
        priority: 2,
        isActive: true,
      },
      {
        id: "biz-004",
        name: "High Dollar Claim Review",
        description: "Claims over $10,000 require additional review",
        category: "business_rule",
        conditions: [{ field: "Total Charges", operator: "greater_than", value: 10000 }],
        conditionLogic: "and",
        actions: [
          { type: "warning", message: "High dollar claim - additional documentation review recommended" },
        ],
        priority: 2,
        isActive: true,
      },

      // Document Rules
      {
        id: "doc-001",
        name: "Document Quality Check",
        description: "Document must meet minimum quality threshold",
        category: "document",
        conditions: [{ field: "_qualityScore", operator: "greater_than_or_equal", value: 70 }],
        conditionLogic: "and",
        actions: [
          { type: "pass", message: "Document quality meets threshold" },
          { type: "fail", message: "Document quality too low - consider rescanning" },
        ],
        priority: 1,
        isActive: true,
      },
      {
        id: "doc-002",
        name: "Supporting Documentation Required",
        description: "Certain procedures require supporting documentation",
        category: "document",
        conditions: [
          { field: "CPT Code", operator: "regex", value: "^(27447|27130|63030)$" },
          { field: "_hasOperativeNotes", operator: "equals", value: "false" },
        ],
        conditionLogic: "and",
        actions: [
          { type: "warning", message: "Procedure may require operative notes - verify documentation" },
        ],
        priority: 2,
        isActive: true,
      },
    ]
  }

  addRule(rule: BusinessRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => a.priority - b.priority)
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId)
  }

  updateRule(ruleId: string, updates: Partial<BusinessRule>): void {
    const index = this.rules.findIndex((r) => r.id === ruleId)
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates }
    }
  }

  getRules(): BusinessRule[] {
    return this.rules
  }

  execute(context: RuleExecutionContext): RuleResult[] {
    const results: RuleResult[] = []

    for (const rule of this.rules.filter((r) => r.isActive)) {
      const result = this.evaluateRule(rule, context)
      results.push(result)
    }

    return results
  }

  executeByCategory(
    context: RuleExecutionContext,
    category: "eligibility" | "code" | "business_rule" | "document"
  ): RuleResult[] {
    const results: RuleResult[] = []
    const categoryRules = this.rules.filter((r) => r.isActive && r.category === category)

    for (const rule of categoryRules) {
      const result = this.evaluateRule(rule, context)
      results.push(result)
    }

    return results
  }

  private evaluateRule(rule: BusinessRule, context: RuleExecutionContext): RuleResult {
    const conditionResults = rule.conditions.map((condition) =>
      this.evaluateCondition(condition, context)
    )

    const passed =
      rule.conditionLogic === "and"
        ? conditionResults.every((r) => r)
        : conditionResults.some((r) => r)

    // Determine which action to apply
    const action = passed ? rule.actions[0] : rule.actions[rule.actions.length > 1 ? 1 : 0]

    const status = action.type === "pass" ? "pass" : action.type === "fail" ? "fail" : "warning"

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      validationCheck: {
        id: rule.id,
        category: rule.category,
        name: rule.name,
        description: rule.description,
        status,
        details: action.message,
      },
    }
  }

  private evaluateCondition(condition: RuleCondition, context: RuleExecutionContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context)

    switch (condition.operator) {
      case "equals":
        return this.compareValues(fieldValue, condition.value, condition.caseSensitive) === 0

      case "not_equals":
        return this.compareValues(fieldValue, condition.value, condition.caseSensitive) !== 0

      case "contains":
        return String(fieldValue)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase())

      case "not_contains":
        return !String(fieldValue)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase())

      case "starts_with":
        return String(fieldValue)
          .toLowerCase()
          .startsWith(String(condition.value).toLowerCase())

      case "ends_with":
        return String(fieldValue)
          .toLowerCase()
          .endsWith(String(condition.value).toLowerCase())

      case "greater_than":
        return Number(fieldValue) > Number(condition.value)

      case "less_than":
        return Number(fieldValue) < Number(condition.value)

      case "greater_than_or_equal":
        return Number(fieldValue) >= Number(condition.value)

      case "less_than_or_equal":
        return Number(fieldValue) <= Number(condition.value)

      case "in_list":
        if (Array.isArray(condition.value)) {
          return condition.value.includes(String(fieldValue))
        }
        return false

      case "not_in_list":
        if (Array.isArray(condition.value)) {
          return !condition.value.includes(String(fieldValue))
        }
        return true

      case "regex":
        try {
          const regex = new RegExp(String(condition.value), condition.caseSensitive ? "" : "i")
          return regex.test(String(fieldValue))
        } catch {
          return false
        }

      case "is_empty":
        return !fieldValue || String(fieldValue).trim() === ""

      case "is_not_empty":
        return !!fieldValue && String(fieldValue).trim() !== ""

      case "is_valid_npi":
        return this.validateNPI(String(fieldValue))

      case "is_valid_date":
        return this.validateDate(String(fieldValue))

      case "is_valid_icd10":
        return this.validateICD10(String(fieldValue))

      case "is_valid_cpt":
        return this.validateCPT(String(fieldValue))

      default:
        return false
    }
  }

  private getFieldValue(fieldPath: string, context: RuleExecutionContext): string | number | null {
    // Check metadata fields (prefixed with _)
    if (fieldPath.startsWith("_") && context.metadata) {
      return context.metadata[fieldPath.substring(1)] as string | number | null
    }

    // Check special context fields
    switch (fieldPath) {
      case "Total Charges":
        return context.claimAmount ?? null
      case "Date of Service":
        return context.dateOfService ?? null
      case "Document Type":
        return context.documentType ?? null
    }

    // Search in extracted fields
    const field = context.fields.find(
      (f) => f.label.toLowerCase() === fieldPath.toLowerCase()
    )
    return field?.value ?? null
  }

  private compareValues(
    a: string | number | null,
    b: string | number | string[] | undefined,
    caseSensitive?: boolean
  ): number {
    if (a === null || b === undefined) return a === b ? 0 : -1

    const aStr = String(a)
    const bStr = String(b)

    if (caseSensitive) {
      return aStr.localeCompare(bStr)
    }
    return aStr.toLowerCase().localeCompare(bStr.toLowerCase())
  }

  // Validation helper methods
  private validateNPI(npi: string): boolean {
    if (!npi || npi.length !== 10) return false
    if (!/^\d{10}$/.test(npi)) return false

    // Luhn algorithm check
    const digits = npi.split("").map(Number)
    let sum = 24 // Prefix for healthcare NPI

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i]
      if ((digits.length - i) % 2 === 0) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
    }

    return sum % 10 === 0
  }

  private validateDate(date: string): boolean {
    if (!date) return false

    // Try various date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{8}$/, // YYYYMMDD
    ]

    if (!formats.some((f) => f.test(date))) return false

    const parsed = new Date(date)
    if (isNaN(parsed.getTime())) return false

    // Check if not in future
    return parsed <= new Date()
  }

  private validateICD10(code: string): boolean {
    if (!code) return false
    // ICD-10 format: Letter followed by 2-7 alphanumeric characters
    return /^[A-TV-Z]\d{2}(\.\d{1,4})?$/.test(code.toUpperCase())
  }

  private validateCPT(code: string): boolean {
    if (!code) return false
    // CPT format: 5 digits, optionally with modifier
    return /^\d{5}(-\d{2})?$/.test(code)
  }
}

// Singleton instance
const globalForRulesEngine = globalThis as unknown as {
  rulesEngine: RulesEngine | undefined
}

export const rulesEngine = globalForRulesEngine.rulesEngine ?? new RulesEngine()

if (process.env.NODE_ENV !== "production") globalForRulesEngine.rulesEngine = rulesEngine

export default rulesEngine
