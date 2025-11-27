import rulesEngine, { BusinessRule, RuleExecutionContext } from "@/lib/rules/engine"

describe("Rules Engine", () => {
  describe("Default Rules", () => {
    it("should have default rules loaded", () => {
      const rules = rulesEngine.getRules()
      expect(rules.length).toBeGreaterThan(0)
    })

    it("should have rules for all categories", () => {
      const rules = rulesEngine.getRules()
      const categories = new Set(rules.map((r) => r.category))
      expect(categories.has("eligibility")).toBe(true)
      expect(categories.has("code")).toBe(true)
      expect(categories.has("business_rule")).toBe(true)
      expect(categories.has("document")).toBe(true)
    })
  })

  describe("Rule Execution", () => {
    it("should execute rules and return results", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "patient", label: "Member ID", value: "ABC123456", confidence: 95, isEdited: false },
          { id: "2", category: "provider", label: "Provider NPI", value: "1234567890", confidence: 96, isEdited: false },
        ],
      }

      const results = rulesEngine.execute(context)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty("ruleId")
      expect(results[0]).toHaveProperty("ruleName")
      expect(results[0]).toHaveProperty("passed")
      expect(results[0]).toHaveProperty("validationCheck")
    })

    it("should pass eligibility rule when Member ID is present", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "patient", label: "Member ID", value: "ABC123456", confidence: 95, isEdited: false },
        ],
      }

      const results = rulesEngine.executeByCategory(context, "eligibility")
      const memberIdRule = results.find((r) => r.ruleName === "Member ID Required")
      expect(memberIdRule?.passed).toBe(true)
    })

    it("should fail eligibility rule when Member ID is missing", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "patient", label: "Patient Name", value: "John Doe", confidence: 95, isEdited: false },
        ],
      }

      const results = rulesEngine.executeByCategory(context, "eligibility")
      const memberIdRule = results.find((r) => r.ruleName === "Member ID Required")
      expect(memberIdRule?.passed).toBe(false)
    })

    it("should validate NPI format correctly", () => {
      // Valid NPI (10 digits, passes Luhn)
      const validContext: RuleExecutionContext = {
        fields: [
          { id: "1", category: "provider", label: "Provider NPI", value: "1234567893", confidence: 96, isEdited: false },
        ],
      }

      const validResults = rulesEngine.executeByCategory(validContext, "code")
      const npiRule = validResults.find((r) => r.ruleName === "Valid NPI Format")
      expect(npiRule).toBeDefined()
    })

    it("should detect ICD-10 code format", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "codes", label: "Diagnosis Code", value: "J06.9", confidence: 91, isEdited: false },
        ],
      }

      const results = rulesEngine.executeByCategory(context, "code")
      const icdRule = results.find((r) => r.ruleName === "Valid ICD-10 Diagnosis Code")
      expect(icdRule).toBeDefined()
    })

    it("should detect CPT code format", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "codes", label: "CPT Code", value: "99213", confidence: 93, isEdited: false },
        ],
      }

      const results = rulesEngine.executeByCategory(context, "code")
      const cptRule = results.find((r) => r.ruleName === "Valid CPT Code")
      expect(cptRule).toBeDefined()
    })

    it("should check date of service validation", () => {
      const context: RuleExecutionContext = {
        fields: [],
        dateOfService: "2024-01-15",
      }

      const results = rulesEngine.executeByCategory(context, "business_rule")
      const dateRule = results.find((r) => r.ruleName === "Date of Service Validation")
      expect(dateRule).toBeDefined()
    })

    it("should flag high dollar claims", () => {
      const context: RuleExecutionContext = {
        fields: [],
        claimAmount: 15000,
      }

      const results = rulesEngine.executeByCategory(context, "business_rule")
      const highDollarRule = results.find((r) => r.ruleName === "High Dollar Claim Review")
      expect(highDollarRule).toBeDefined()
    })

    it("should check document quality", () => {
      const context: RuleExecutionContext = {
        fields: [],
        metadata: {
          qualityScore: 75,
        },
      }

      const results = rulesEngine.executeByCategory(context, "document")
      const qualityRule = results.find((r) => r.ruleName === "Document Quality Check")
      expect(qualityRule).toBeDefined()
    })
  })

  describe("Rule Management", () => {
    it("should add a new rule", () => {
      const initialCount = rulesEngine.getRules().length

      const newRule: BusinessRule = {
        id: "test-rule-001",
        name: "Test Rule",
        description: "A test rule",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "is_not_empty" }],
        conditionLogic: "and",
        actions: [{ type: "pass", message: "Test passed" }],
        priority: 100,
        isActive: true,
      }

      rulesEngine.addRule(newRule)
      expect(rulesEngine.getRules().length).toBe(initialCount + 1)

      // Clean up
      rulesEngine.removeRule("test-rule-001")
    })

    it("should remove a rule", () => {
      const newRule: BusinessRule = {
        id: "test-rule-002",
        name: "Rule to Remove",
        description: "This rule will be removed",
        category: "business_rule",
        conditions: [{ field: "Test", operator: "is_not_empty" }],
        conditionLogic: "and",
        actions: [{ type: "pass" }],
        priority: 100,
        isActive: true,
      }

      rulesEngine.addRule(newRule)
      const countAfterAdd = rulesEngine.getRules().length

      rulesEngine.removeRule("test-rule-002")
      expect(rulesEngine.getRules().length).toBe(countAfterAdd - 1)
    })

    it("should update a rule", () => {
      const newRule: BusinessRule = {
        id: "test-rule-003",
        name: "Rule to Update",
        description: "This rule will be updated",
        category: "business_rule",
        conditions: [{ field: "Test", operator: "is_not_empty" }],
        conditionLogic: "and",
        actions: [{ type: "pass" }],
        priority: 100,
        isActive: true,
      }

      rulesEngine.addRule(newRule)
      rulesEngine.updateRule("test-rule-003", { name: "Updated Rule Name" })

      const updatedRule = rulesEngine.getRules().find((r) => r.id === "test-rule-003")
      expect(updatedRule?.name).toBe("Updated Rule Name")

      // Clean up
      rulesEngine.removeRule("test-rule-003")
    })
  })

  describe("Condition Operators", () => {
    const testField = { id: "1", category: "patient" as const, label: "Test Field", value: "", confidence: 100, isEdited: false }

    it("should handle equals operator", () => {
      const context: RuleExecutionContext = {
        fields: [{ ...testField, value: "test value" }],
      }

      const rule: BusinessRule = {
        id: "test-equals",
        name: "Test Equals",
        description: "Test equals operator",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "equals", value: "test value" }],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-equals")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-equals")
    })

    it("should handle contains operator", () => {
      const context: RuleExecutionContext = {
        fields: [{ ...testField, value: "hello world" }],
      }

      const rule: BusinessRule = {
        id: "test-contains",
        name: "Test Contains",
        description: "Test contains operator",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "contains", value: "world" }],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-contains")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-contains")
    })

    it("should handle greater_than operator", () => {
      const context: RuleExecutionContext = {
        fields: [{ ...testField, value: "100" }],
      }

      const rule: BusinessRule = {
        id: "test-gt",
        name: "Test Greater Than",
        description: "Test greater than operator",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "greater_than", value: 50 }],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-gt")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-gt")
    })

    it("should handle in_list operator", () => {
      const context: RuleExecutionContext = {
        fields: [{ ...testField, value: "A" }],
      }

      const rule: BusinessRule = {
        id: "test-inlist",
        name: "Test In List",
        description: "Test in list operator",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "in_list", value: ["A", "B", "C"] }],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-inlist")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-inlist")
    })

    it("should handle regex operator", () => {
      const context: RuleExecutionContext = {
        fields: [{ ...testField, value: "ABC123" }],
      }

      const rule: BusinessRule = {
        id: "test-regex",
        name: "Test Regex",
        description: "Test regex operator",
        category: "business_rule",
        conditions: [{ field: "Test Field", operator: "regex", value: "^[A-Z]{3}\\d{3}$" }],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-regex")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-regex")
    })
  })

  describe("Condition Logic", () => {
    it("should handle AND logic correctly", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "patient", label: "Field A", value: "yes", confidence: 100, isEdited: false },
          { id: "2", category: "patient", label: "Field B", value: "yes", confidence: 100, isEdited: false },
        ],
      }

      const rule: BusinessRule = {
        id: "test-and",
        name: "Test AND",
        description: "Test AND logic",
        category: "business_rule",
        conditions: [
          { field: "Field A", operator: "equals", value: "yes" },
          { field: "Field B", operator: "equals", value: "yes" },
        ],
        conditionLogic: "and",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-and")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-and")
    })

    it("should handle OR logic correctly", () => {
      const context: RuleExecutionContext = {
        fields: [
          { id: "1", category: "patient", label: "Field A", value: "no", confidence: 100, isEdited: false },
          { id: "2", category: "patient", label: "Field B", value: "yes", confidence: 100, isEdited: false },
        ],
      }

      const rule: BusinessRule = {
        id: "test-or",
        name: "Test OR",
        description: "Test OR logic",
        category: "business_rule",
        conditions: [
          { field: "Field A", operator: "equals", value: "yes" },
          { field: "Field B", operator: "equals", value: "yes" },
        ],
        conditionLogic: "or",
        actions: [{ type: "pass" }, { type: "fail" }],
        priority: 1,
        isActive: true,
      }

      rulesEngine.addRule(rule)
      const results = rulesEngine.execute(context)
      const testResult = results.find((r) => r.ruleId === "test-or")
      expect(testResult?.passed).toBe(true)

      rulesEngine.removeRule("test-or")
    })
  })
})
