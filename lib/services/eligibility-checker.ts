/**
 * Eligibility Checker Service
 * Validates patient eligibility, coverage, and prior authorization
 */

export interface EligibilityCheckResult {
  check: string
  status: "PASS" | "FAIL" | "WARNING" | "INFO"
  details: string
}

export interface EligibilityResult {
  overallStatus: "PASS" | "FAIL" | "WARNING"
  checks: EligibilityCheckResult[]
}

export interface ClaimData {
  memberId?: string
  groupNumber?: string
  dateOfService?: string
  providerNpi?: string
  priorAuthNumber?: string
  procedures?: { cptCode: string; charges: number }[]
  payerName?: string
}

export class EligibilityChecker {
  /**
   * Run all eligibility checks on the claim data
   */
  async check(claimData: ClaimData): Promise<EligibilityResult> {
    const checks: EligibilityCheckResult[] = []

    // Check 1: Is coverage active?
    checks.push(this.checkCoverageActive(claimData))

    // Check 2: Is provider in-network?
    checks.push(this.checkProviderNetwork(claimData))

    // Check 3: Is prior authorization valid?
    checks.push(this.checkPriorAuthorization(claimData))

    // Check 4: Deductible status
    checks.push(this.checkDeductibleStatus(claimData))

    // Check 5: Benefits verification
    checks.push(this.checkBenefitsVerification(claimData))

    // Determine overall status
    const hasFail = checks.some((c) => c.status === "FAIL")
    const hasWarning = checks.some((c) => c.status === "WARNING")

    return {
      overallStatus: hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS",
      checks,
    }
  }

  private checkCoverageActive(data: ClaimData): EligibilityCheckResult {
    if (!data.memberId) {
      return {
        check: "coverage_active",
        status: "FAIL",
        details: "Member ID is missing - cannot verify coverage",
      }
    }

    // In production, this would call payer API
    // For demo, simulate successful verification
    const currentYear = new Date().getFullYear()
    return {
      check: "coverage_active",
      status: "PASS",
      details: `Coverage active from ${currentYear}-01-01 to ${currentYear}-12-31`,
    }
  }

  private checkProviderNetwork(data: ClaimData): EligibilityCheckResult {
    if (!data.providerNpi) {
      return {
        check: "provider_in_network",
        status: "WARNING",
        details: "Provider NPI not provided - network status unknown",
      }
    }

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(data.providerNpi)) {
      return {
        check: "provider_in_network",
        status: "FAIL",
        details: "Invalid NPI format - must be 10 digits",
      }
    }

    // In production, this would check network participation
    return {
      check: "provider_in_network",
      status: "PASS",
      details: `Provider ${data.providerNpi} is participating in ${data.payerName || "payer"} network`,
    }
  }

  private checkPriorAuthorization(data: ClaimData): EligibilityCheckResult {
    // Check if procedures require prior auth
    const requiresAuth = data.procedures?.some((p) =>
      this.procedureRequiresAuth(p.cptCode)
    )

    if (!requiresAuth) {
      return {
        check: "prior_authorization",
        status: "PASS",
        details: "No prior authorization required for these procedures",
      }
    }

    if (!data.priorAuthNumber) {
      return {
        check: "prior_authorization",
        status: "FAIL",
        details: "Prior authorization required but not provided",
      }
    }

    // Validate auth format
    if (!/^AUTH-\d{4}-\d{6}$/.test(data.priorAuthNumber)) {
      return {
        check: "prior_authorization",
        status: "WARNING",
        details: "Prior authorization number format may be invalid",
      }
    }

    return {
      check: "prior_authorization",
      status: "PASS",
      details: `Auth ${data.priorAuthNumber} verified for procedures`,
    }
  }

  private checkDeductibleStatus(data: ClaimData): EligibilityCheckResult {
    if (!data.memberId) {
      return {
        check: "deductible_status",
        status: "INFO",
        details: "Cannot check deductible without member ID",
      }
    }

    // In production, this would query payer for deductible info
    return {
      check: "deductible_status",
      status: "INFO",
      details: "Annual deductible: $1,500 | Met: $1,500 | Remaining: $0",
    }
  }

  private checkBenefitsVerification(data: ClaimData): EligibilityCheckResult {
    if (!data.procedures || data.procedures.length === 0) {
      return {
        check: "benefits_verification",
        status: "INFO",
        details: "No procedures to verify benefits for",
      }
    }

    // Check if any procedures might not be covered
    const highCostProcedures = data.procedures.filter((p) => p.charges > 10000)

    if (highCostProcedures.length > 0) {
      return {
        check: "benefits_verification",
        status: "WARNING",
        details: `High-cost procedure(s) detected - verify coverage limits`,
      }
    }

    return {
      check: "benefits_verification",
      status: "PASS",
      details: "All procedures appear to be covered under plan benefits",
    }
  }

  private procedureRequiresAuth(cptCode: string): boolean {
    // Major surgical procedures that typically require prior auth
    const authRequiredCodes = [
      "27447", // Total knee arthroplasty
      "27130", // Total hip arthroplasty
      "63030", // Lumbar laminectomy
      "22551", // Cervical fusion
      "29881", // Knee arthroscopy with meniscectomy
      "43239", // Upper GI endoscopy with biopsy
    ]
    return authRequiredCodes.includes(cptCode)
  }
}

export const eligibilityChecker = new EligibilityChecker()
export default eligibilityChecker
