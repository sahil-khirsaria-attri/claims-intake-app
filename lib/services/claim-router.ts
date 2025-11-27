/**
 * Claim Router Service
 * Determines where a claim should be routed based on validation results
 */

import type { EligibilityResult } from "./eligibility-checker"
import type { CodeValidationSummary } from "./code-validator"
import type { DocumentCheckResult } from "./document-checker"

export type RoutingQueue = "CLEAN_SUBMISSION" | "EXCEPTION_QUEUE" | "HUMAN_REVIEW"
export type RoutingAction = "AUTO_SUBMIT" | "AUTO_CORRECT_AND_SUBMIT" | "MANUAL_REVIEW_REQUIRED"

export interface RoutingIssue {
  severity: "HIGH" | "MEDIUM" | "LOW" | "WARNING"
  category: "eligibility" | "coding" | "compliance" | "documentation"
  issue: string
  recommendation: string
}

export interface RoutingDecision {
  claimId: string
  queue: RoutingQueue
  action: RoutingAction
  priority: "HIGH" | "MEDIUM" | "LOW"
  reason: string
  confidenceScore: number
  issuesToResolve: RoutingIssue[]
  autoCorrections?: {
    field: string
    original: string
    corrected: string
    reason: string
  }[]
  estimatedResolutionTime?: string
}

export interface ValidationSummary {
  eligibility: EligibilityResult
  codeValidation: CodeValidationSummary
  documentCheck: DocumentCheckResult
  businessRules?: {
    overallStatus: "PASS" | "FAIL" | "WARNING"
    checks: { rule: string; status: string; details: string }[]
  }
}

export class ClaimRouter {
  /**
   * Determine routing based on validation results
   */
  route(claimId: string, validationSummary: ValidationSummary, totalCharges: number): RoutingDecision {
    const issues: RoutingIssue[] = []

    // Collect issues from eligibility checks
    for (const check of validationSummary.eligibility.checks) {
      if (check.status === "FAIL") {
        issues.push({
          severity: "HIGH",
          category: "eligibility",
          issue: check.details,
          recommendation: this.getEligibilityRecommendation(check.check),
        })
      } else if (check.status === "WARNING") {
        issues.push({
          severity: "WARNING",
          category: "eligibility",
          issue: check.details,
          recommendation: this.getEligibilityRecommendation(check.check),
        })
      }
    }

    // Collect issues from code validation
    for (const check of validationSummary.codeValidation.checks) {
      if (check.status === "FAIL") {
        issues.push({
          severity: "HIGH",
          category: "coding",
          issue: check.details,
          recommendation: "Review and correct the coding error",
        })
      } else if (check.status === "WARNING") {
        issues.push({
          severity: "WARNING",
          category: "coding",
          issue: check.details,
          recommendation: check.details.includes("modifier")
            ? "Add modifier 25 if separate E/M service was performed"
            : "Review coding for accuracy",
        })
      }
    }

    // Collect issues from document check
    for (const missing of validationSummary.documentCheck.missingDocuments) {
      issues.push({
        severity: missing.priority === "HIGH" ? "HIGH" : missing.priority === "MEDIUM" ? "MEDIUM" : "LOW",
        category: "documentation",
        issue: `Missing ${missing.displayName}`,
        recommendation: `Attach ${missing.displayName.toLowerCase()} before submission`,
      })
    }

    // Collect issues from business rules
    if (validationSummary.businessRules) {
      for (const check of validationSummary.businessRules.checks) {
        if (check.status === "FAIL") {
          issues.push({
            severity: "HIGH",
            category: "compliance",
            issue: check.details,
            recommendation: "Review and resolve compliance issue",
          })
        } else if (check.status === "WARNING") {
          issues.push({
            severity: "WARNING",
            category: "compliance",
            issue: check.details,
            recommendation: "Consider addressing before submission",
          })
        }
      }
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(validationSummary)

    // Count issues by severity
    const highSeverityCount = issues.filter((i) => i.severity === "HIGH").length
    const mediumSeverityCount = issues.filter((i) => i.severity === "MEDIUM").length
    const warningCount = issues.filter((i) => i.severity === "WARNING").length

    // Determine routing
    let queue: RoutingQueue
    let action: RoutingAction
    let priority: "HIGH" | "MEDIUM" | "LOW"
    let reason: string
    let estimatedResolutionTime: string | undefined

    // High value claims (>$10,000) with any issues go to human review
    const isHighValue = totalCharges > 10000

    if (confidenceScore >= 95 && highSeverityCount === 0 && warningCount === 0 && !isHighValue) {
      // Clean claim - auto submit
      queue = "CLEAN_SUBMISSION"
      action = "AUTO_SUBMIT"
      priority = "LOW"
      reason = "All validations passed with high confidence"
    } else if (highSeverityCount === 0 && mediumSeverityCount === 0 && warningCount <= 2 && !isHighValue) {
      // Minor issues - can auto-correct and submit
      queue = "EXCEPTION_QUEUE"
      action = "AUTO_CORRECT_AND_SUBMIT"
      priority = "MEDIUM"
      reason = "Minor issues that can be auto-corrected"
      estimatedResolutionTime = "1-2 hours"
    } else {
      // Needs human review
      queue = "HUMAN_REVIEW"
      action = "MANUAL_REVIEW_REQUIRED"
      priority = highSeverityCount > 0 ? "HIGH" : "MEDIUM"

      if (validationSummary.documentCheck.status === "INCOMPLETE") {
        reason = "Missing required documentation"
      } else if (highSeverityCount > 0) {
        reason = "High severity issues require manual review"
      } else if (isHighValue) {
        reason = "High-value claim requires manual review"
      } else {
        reason = "Multiple issues require manual review"
      }
      estimatedResolutionTime = highSeverityCount > 0 ? "24-48 hours" : "4-8 hours"
    }

    // Generate auto-corrections for phone and tax ID formatting
    const autoCorrections = this.generateAutoCorrections()

    return {
      claimId,
      queue,
      action,
      priority,
      reason,
      confidenceScore,
      issuesToResolve: issues,
      autoCorrections,
      estimatedResolutionTime,
    }
  }

  private calculateConfidenceScore(summary: ValidationSummary): number {
    let score = 100

    // Deduct for eligibility issues
    for (const check of summary.eligibility.checks) {
      if (check.status === "FAIL") score -= 20
      else if (check.status === "WARNING") score -= 5
    }

    // Deduct for code validation issues
    for (const check of summary.codeValidation.checks) {
      if (check.status === "FAIL") score -= 15
      else if (check.status === "WARNING") score -= 3
    }

    // Deduct for missing documents
    for (const missing of summary.documentCheck.missingDocuments) {
      if (missing.priority === "HIGH") score -= 10
      else if (missing.priority === "MEDIUM") score -= 5
      else score -= 2
    }

    // Deduct for business rule issues
    if (summary.businessRules) {
      for (const check of summary.businessRules.checks) {
        if (check.status === "FAIL") score -= 15
        else if (check.status === "WARNING") score -= 3
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private getEligibilityRecommendation(check: string): string {
    const recommendations: Record<string, string> = {
      coverage_active: "Verify member eligibility with payer",
      provider_in_network: "Confirm provider network participation or submit as out-of-network",
      prior_authorization: "Obtain prior authorization before resubmission",
      deductible_status: "Inform patient of deductible responsibility",
      benefits_verification: "Verify procedure is covered under plan benefits",
    }
    return recommendations[check] || "Review and resolve eligibility issue"
  }

  private generateAutoCorrections(): { field: string; original: string; corrected: string; reason: string }[] {
    // In a real implementation, this would analyze the actual claim data
    // For now, return example corrections
    return [
      {
        field: "phone",
        original: "(512) 555-0147",
        corrected: "5125550147",
        reason: "Standardized to 10-digit format",
      },
      {
        field: "tax_id",
        original: "74-1234567",
        corrected: "741234567",
        reason: "Removed hyphen for EDI format",
      },
    ]
  }

  /**
   * Generate a human-readable summary of the routing decision
   */
  generateSummary(decision: RoutingDecision): string {
    const lines: string[] = []

    lines.push(`Claim ${decision.claimId}`)
    lines.push(`Queue: ${decision.queue}`)
    lines.push(`Action: ${decision.action}`)
    lines.push(`Priority: ${decision.priority}`)
    lines.push(`Confidence Score: ${decision.confidenceScore}%`)
    lines.push(`Reason: ${decision.reason}`)

    if (decision.issuesToResolve.length > 0) {
      lines.push("")
      lines.push("Issues to Resolve:")
      for (const issue of decision.issuesToResolve) {
        lines.push(`  [${issue.severity}] ${issue.issue}`)
        lines.push(`    → ${issue.recommendation}`)
      }
    }

    if (decision.autoCorrections && decision.autoCorrections.length > 0) {
      lines.push("")
      lines.push("Auto-corrections Applied:")
      for (const correction of decision.autoCorrections) {
        lines.push(`  ${correction.field}: "${correction.original}" → "${correction.corrected}"`)
      }
    }

    if (decision.estimatedResolutionTime) {
      lines.push("")
      lines.push(`Estimated Resolution Time: ${decision.estimatedResolutionTime}`)
    }

    return lines.join("\n")
  }
}

export const claimRouter = new ClaimRouter()
export default claimRouter
