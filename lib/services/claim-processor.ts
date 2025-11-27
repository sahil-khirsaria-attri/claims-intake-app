/**
 * Claim Processor Service
 * Main orchestrator for the claims intake and validation workflow
 */

import prisma from "@/lib/db/prisma"
import { eligibilityChecker, type EligibilityResult } from "./eligibility-checker"
import { codeValidator, type CodeValidationSummary } from "./code-validator"
import { documentChecker, type DocumentCheckResult } from "./document-checker"
import { claimRouter, type RoutingDecision, type ValidationSummary } from "./claim-router"

export interface ProcessingResult {
  claimId: string
  status: "success" | "error"
  eligibility: EligibilityResult
  codeValidation: CodeValidationSummary
  documentCheck: DocumentCheckResult
  businessRules: {
    overallStatus: "PASS" | "FAIL" | "WARNING"
    checks: { rule: string; status: string; details: string }[]
  }
  routingDecision: RoutingDecision
  validationChecksSaved: number
  error?: string
}

export class ClaimProcessor {
  /**
   * Process a claim through the full validation pipeline
   */
  async process(claimId: string): Promise<ProcessingResult> {
    try {
      // 1. Get claim with all related data
      const claim = await prisma.claim.findUnique({
        where: { id: claimId },
        include: {
          documents: true,
          extractedFields: true,
        },
      })

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`)
      }

      // 2. Update claim status to processing
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "processing" },
      })

      // 3. Extract relevant data from extracted fields
      const claimData = this.extractClaimData(claim.extractedFields)

      // 4. Run eligibility checks
      const eligibilityResult = await eligibilityChecker.check({
        memberId: claimData.memberId,
        groupNumber: claimData.groupNumber,
        dateOfService: claimData.dateOfService,
        providerNpi: claimData.providerNpi,
        priorAuthNumber: claimData.priorAuthNumber,
        procedures: claimData.procedures,
        payerName: claimData.payerName,
      })

      // 5. Run code validation
      const codeValidationResult = await codeValidator.validate({
        diagnosisCodes: claimData.diagnosisCodes,
        procedures: claimData.procedures.map((p) => ({
          cptCode: p.cptCode,
          modifiers: p.modifiers,
          charges: p.charges,
          units: p.units || 1,
          dateOfService: claimData.dateOfService || new Date().toISOString().split("T")[0],
          diagnosisPointers: p.diagnosisPointers,
        })),
        patientDob: claimData.patientDob,
        patientGender: claimData.patientGender,
      })

      // 6. Check for missing documents
      const documentTypes = claim.documents.map((d) => d.type)
      const procedureCodes = claimData.procedures.map((p) => p.cptCode)
      const documentCheckResult = documentChecker.check(procedureCodes, documentTypes)

      // 7. Run business rules
      const businessRulesResult = this.runBusinessRules(claimData, claim.totalAmount || 0)

      // 8. Get routing decision
      const validationSummary: ValidationSummary = {
        eligibility: eligibilityResult,
        codeValidation: codeValidationResult,
        documentCheck: documentCheckResult,
        businessRules: businessRulesResult,
      }

      const routingDecision = claimRouter.route(
        claimId,
        validationSummary,
        claim.totalAmount || 0
      )

      // 9. Save validation checks to database
      const validationChecksSaved = await this.saveValidationChecks(
        claimId,
        eligibilityResult,
        codeValidationResult,
        documentCheckResult,
        businessRulesResult
      )

      // 10. Update claim status based on routing decision
      const newStatus = this.mapRouteToStatus(routingDecision.queue)
      await prisma.claim.update({
        where: { id: claimId },
        data: {
          status: newStatus,
          confidenceScore: routingDecision.confidenceScore,
        },
      })

      return {
        claimId,
        status: "success",
        eligibility: eligibilityResult,
        codeValidation: codeValidationResult,
        documentCheck: documentCheckResult,
        businessRules: businessRulesResult,
        routingDecision,
        validationChecksSaved,
      }
    } catch (error) {
      console.error("Claim processing error:", error)

      // Update claim status to exception
      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "exception" },
      })

      return {
        claimId,
        status: "error",
        eligibility: { overallStatus: "FAIL", checks: [] },
        codeValidation: { overallStatus: "FAIL", checks: [] },
        documentCheck: { status: "INCOMPLETE", requiredDocuments: [], receivedDocuments: [], missingDocuments: [] },
        businessRules: { overallStatus: "FAIL", checks: [] },
        routingDecision: {
          claimId,
          queue: "HUMAN_REVIEW",
          action: "MANUAL_REVIEW_REQUIRED",
          priority: "HIGH",
          reason: "Processing error occurred",
          confidenceScore: 0,
          issuesToResolve: [],
        },
        validationChecksSaved: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private extractClaimData(extractedFields: { category: string; label: string; value: string }[]) {
    const getField = (label: string): string | undefined => {
      const field = extractedFields.find(
        (f) => f.label.toLowerCase().includes(label.toLowerCase())
      )
      return field?.value
    }

    const getFieldsByCategory = (category: string) =>
      extractedFields.filter((f) => f.category === category)

    // Extract patient info
    const patientDob = getField("dob") || getField("date of birth") || getField("birth")
    const patientGender = getField("gender") || getField("sex")

    // Extract member/insurance info
    const memberId = getField("member id") || getField("insurance id") || getField("subscriber id")
    const groupNumber = getField("group") || getField("group number")
    const priorAuthNumber = getField("auth") || getField("authorization")
    const payerName = getField("payer") || getField("insurance") || getField("carrier")

    // Extract provider info
    const providerNpi = getField("npi")

    // Extract diagnosis codes
    const diagnosisCodes: { code: string; description?: string; sequence: number }[] = []
    const codeFields = getFieldsByCategory("codes")
    let diagSeq = 1
    for (const field of codeFields) {
      if (field.label.toLowerCase().includes("diagnosis") || field.label.toLowerCase().includes("icd")) {
        // Handle both formats: "M17.11" or "M17.11 - Primary osteoarthritis"
        const parts = field.value.split(" - ")
        diagnosisCodes.push({
          code: parts[0].trim(),
          description: parts[1]?.trim(),
          sequence: diagSeq++,
        })
      }
    }

    // Extract procedures
    const procedures: {
      cptCode: string
      modifiers?: string[]
      charges: number
      units?: number
      diagnosisPointers?: string[]
    }[] = []

    for (const field of codeFields) {
      if (field.label.toLowerCase().includes("cpt") || field.label.toLowerCase().includes("procedure")) {
        // Parse CPT code and charges
        const match = field.value.match(/(\d{5})(?:\s*-\s*[^$]*)?(?:\s*\$?([\d,]+\.?\d*))?/)
        if (match) {
          procedures.push({
            cptCode: match[1],
            charges: match[2] ? parseFloat(match[2].replace(",", "")) : 0,
            units: 1,
          })
        }
      }
    }

    // Extract date of service
    const dateOfService = getField("date of service") || getField("service date") || getField("dos")

    return {
      patientDob,
      patientGender,
      memberId,
      groupNumber,
      priorAuthNumber,
      payerName,
      providerNpi,
      diagnosisCodes,
      procedures,
      dateOfService,
    }
  }

  private runBusinessRules(
    claimData: ReturnType<typeof this.extractClaimData>,
    totalAmount: number
  ): { overallStatus: "PASS" | "FAIL" | "WARNING"; checks: { rule: string; status: string; details: string }[] } {
    const checks: { rule: string; status: string; details: string }[] = []

    // Rule 1: NPI format validation
    if (claimData.providerNpi) {
      const isValidNpi = /^\d{10}$/.test(claimData.providerNpi) && this.validateNpiChecksum(claimData.providerNpi)
      checks.push({
        rule: "npi_checksum",
        status: isValidNpi ? "PASS" : "FAIL",
        details: isValidNpi ? "NPI passes Luhn algorithm validation" : "NPI fails checksum validation",
      })
    }

    // Rule 2: Date of service validation
    if (claimData.dateOfService) {
      const dos = new Date(claimData.dateOfService)
      const today = new Date()
      const isValidDate = dos <= today && dos > new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      checks.push({
        rule: "timely_filing",
        status: isValidDate ? "PASS" : "WARNING",
        details: isValidDate
          ? "Claim within 365-day filing limit"
          : "Date of service may be outside filing limit",
      })
    }

    // Rule 3: High dollar claim review
    if (totalAmount > 10000) {
      checks.push({
        rule: "high_dollar_review",
        status: "WARNING",
        details: `High-value claim ($${totalAmount.toLocaleString()}) requires additional review`,
      })
    }

    // Rule 4: Referring provider check
    const needsReferral = claimData.procedures.some((p) =>
      ["99243", "99244", "99245"].includes(p.cptCode)
    )
    if (needsReferral) {
      checks.push({
        rule: "referring_provider",
        status: "WARNING",
        details: "Specialist consultation may require referring provider information",
      })
    }

    // Determine overall status
    const hasFail = checks.some((c) => c.status === "FAIL")
    const hasWarning = checks.some((c) => c.status === "WARNING")

    return {
      overallStatus: hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS",
      checks,
    }
  }

  private validateNpiChecksum(npi: string): boolean {
    // Luhn algorithm for NPI validation
    const digits = ("80840" + npi).split("").map(Number)
    let sum = 0
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

  private async saveValidationChecks(
    claimId: string,
    eligibility: EligibilityResult,
    codeValidation: CodeValidationSummary,
    documentCheck: DocumentCheckResult,
    businessRules: { overallStatus: string; checks: { rule: string; status: string; details: string }[] }
  ): Promise<number> {
    // Delete existing validation checks
    await prisma.validationCheck.deleteMany({
      where: { claimId },
    })

    const checksToCreate: {
      claimId: string
      category: "eligibility" | "code" | "business_rule" | "document"
      name: string
      description: string
      status: "pass" | "warning" | "fail" | "pending"
      details: string
      executedAt: Date
    }[] = []

    // Add eligibility checks
    for (const check of eligibility.checks) {
      checksToCreate.push({
        claimId,
        category: "eligibility",
        name: check.check,
        description: this.getCheckDescription(check.check),
        status: this.mapStatus(check.status),
        details: check.details,
        executedAt: new Date(),
      })
    }

    // Add code validation checks
    for (const check of codeValidation.checks) {
      checksToCreate.push({
        claimId,
        category: "code",
        name: check.check,
        description: this.getCheckDescription(check.check),
        status: this.mapStatus(check.status),
        details: check.details,
        executedAt: new Date(),
      })
    }

    // Add document checks
    if (documentCheck.missingDocuments.length > 0) {
      for (const missing of documentCheck.missingDocuments) {
        checksToCreate.push({
          claimId,
          category: "document",
          name: `missing_${missing.document}`,
          description: `Missing ${missing.displayName}`,
          status: missing.priority === "HIGH" ? "fail" : "warning",
          details: missing.reason,
          executedAt: new Date(),
        })
      }
    } else {
      checksToCreate.push({
        claimId,
        category: "document",
        name: "all_documents_present",
        description: "All required documents present",
        status: "pass",
        details: "All required documents have been attached",
        executedAt: new Date(),
      })
    }

    // Add business rule checks
    for (const check of businessRules.checks) {
      checksToCreate.push({
        claimId,
        category: "business_rule",
        name: check.rule,
        description: this.getCheckDescription(check.rule),
        status: this.mapStatus(check.status),
        details: check.details,
        executedAt: new Date(),
      })
    }

    // Batch create all checks
    await prisma.validationCheck.createMany({
      data: checksToCreate,
    })

    return checksToCreate.length
  }

  private getCheckDescription(checkName: string): string {
    const descriptions: Record<string, string> = {
      coverage_active: "Verify patient coverage is active",
      provider_in_network: "Verify provider is in-network",
      prior_authorization: "Verify prior authorization",
      deductible_status: "Check deductible status",
      benefits_verification: "Verify procedure benefits",
      medical_necessity: "Verify medical necessity",
      bundling_compliance: "Check for bundling issues",
      npi_checksum: "Validate NPI checksum",
      timely_filing: "Verify timely filing",
      high_dollar_review: "High dollar claim review",
      referring_provider: "Referring provider check",
    }
    return descriptions[checkName] || checkName.replace(/_/g, " ")
  }

  private mapStatus(status: string): "pass" | "warning" | "fail" | "pending" {
    switch (status.toUpperCase()) {
      case "PASS":
        return "pass"
      case "WARNING":
      case "INFO":
        return "warning"
      case "FAIL":
        return "fail"
      default:
        return "pending"
    }
  }

  private mapRouteToStatus(queue: string): "validation_complete" | "exception" | "human_review" | "ready_for_submission" {
    switch (queue) {
      case "CLEAN_SUBMISSION":
        return "ready_for_submission"
      case "EXCEPTION_QUEUE":
        return "exception"
      case "HUMAN_REVIEW":
        return "human_review"
      default:
        return "validation_complete"
    }
  }
}

export const claimProcessor = new ClaimProcessor()
export default claimProcessor
