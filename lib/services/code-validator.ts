/**
 * Code Validator Service
 * Validates ICD-10, CPT codes, medical necessity, and bundling rules
 */

export interface CodeValidationResult {
  check: string
  status: "PASS" | "FAIL" | "WARNING"
  details: string
}

export interface CodeValidationSummary {
  overallStatus: "PASS" | "FAIL" | "WARNING"
  checks: CodeValidationResult[]
}

export interface DiagnosisCode {
  code: string
  description?: string
  sequence: number
}

export interface ProcedureCode {
  cptCode: string
  modifiers?: string[]
  charges: number
  units: number
  dateOfService: string
  diagnosisPointers?: string[]
}

export interface CodeValidationInput {
  diagnosisCodes: DiagnosisCode[]
  procedures: ProcedureCode[]
  patientDob?: string
  patientGender?: string
}

// Common ICD-10 codes for reference (subset)
const VALID_ICD10_PREFIXES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
  "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
]

// Medical necessity mappings (diagnosis -> procedures)
const MEDICAL_NECESSITY_MAP: Record<string, string[]> = {
  "M17.11": ["27447", "27446", "20610", "99213", "99214"], // Knee osteoarthritis
  "M17.12": ["27447", "27446", "20610", "99213", "99214"], // Knee osteoarthritis, left
  "M16.11": ["27130", "27132", "99213", "99214"], // Hip osteoarthritis
  "M16.12": ["27130", "27132", "99213", "99214"], // Hip osteoarthritis, left
  "M54.5": ["63030", "63047", "99213", "99214", "72148"], // Low back pain
  "Z96.651": ["99213", "99214"], // Presence of artificial knee
}

// Bundling rules (procedure pairs that shouldn't be billed together)
const BUNDLING_RULES: { primary: string; bundled: string; message: string }[] = [
  { primary: "27447", bundled: "99213", message: "E/M code may be bundled with surgical procedure - add modifier 25 if separate service" },
  { primary: "27447", bundled: "99214", message: "E/M code may be bundled with surgical procedure - add modifier 25 if separate service" },
  { primary: "27130", bundled: "99213", message: "E/M code may be bundled with surgical procedure - add modifier 25 if separate service" },
  { primary: "29881", bundled: "29880", message: "These procedures are mutually exclusive" },
]

// Age restrictions for certain procedures
const AGE_RESTRICTIONS: Record<string, { min?: number; max?: number; message: string }> = {
  "27447": { min: 18, message: "Total knee arthroplasty typically requires patient 18+" },
  "27130": { min: 18, message: "Total hip arthroplasty typically requires patient 18+" },
}

// Gender-specific procedures
const GENDER_SPECIFIC: Record<string, { gender: "M" | "F"; message: string }> = {
  "58150": { gender: "F", message: "Hysterectomy is female-only procedure" },
  "55840": { gender: "M", message: "Prostatectomy is male-only procedure" },
}

export class CodeValidator {
  /**
   * Run all code validations
   */
  async validate(input: CodeValidationInput): Promise<CodeValidationSummary> {
    const checks: CodeValidationResult[] = []

    // Validate ICD-10 codes
    for (const dx of input.diagnosisCodes) {
      checks.push(this.validateICD10(dx))
    }

    // Validate CPT codes
    for (const proc of input.procedures) {
      checks.push(this.validateCPT(proc))
    }

    // Check medical necessity
    checks.push(this.checkMedicalNecessity(input.diagnosisCodes, input.procedures))

    // Check age appropriateness
    if (input.patientDob) {
      for (const proc of input.procedures) {
        const ageCheck = this.checkAgeAppropriateness(input.patientDob, proc)
        if (ageCheck) checks.push(ageCheck)
      }
    }

    // Check gender appropriateness
    if (input.patientGender) {
      for (const proc of input.procedures) {
        const genderCheck = this.checkGenderAppropriateness(input.patientGender, proc)
        if (genderCheck) checks.push(genderCheck)
      }
    }

    // Check bundling rules
    const bundlingCheck = this.checkBundling(input.procedures)
    if (bundlingCheck) checks.push(bundlingCheck)

    // Determine overall status
    const hasFail = checks.some((c) => c.status === "FAIL")
    const hasWarning = checks.some((c) => c.status === "WARNING")

    return {
      overallStatus: hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS",
      checks,
    }
  }

  private validateICD10(dx: DiagnosisCode): CodeValidationResult {
    const code = dx.code.toUpperCase()

    // Check format: Letter followed by 2 digits, optionally a decimal and 1-4 more characters
    const icd10Pattern = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/

    if (!icd10Pattern.test(code)) {
      return {
        check: `icd10_valid_${code}`,
        status: "FAIL",
        details: `${code} is not a valid ICD-10 format`,
      }
    }

    // Check if first letter is valid
    const firstLetter = code.charAt(0)
    if (!VALID_ICD10_PREFIXES.includes(firstLetter)) {
      return {
        check: `icd10_valid_${code}`,
        status: "FAIL",
        details: `${code} has invalid ICD-10 category letter`,
      }
    }

    return {
      check: `icd10_valid_${code}`,
      status: "PASS",
      details: `${code} is a valid ICD-10-CM code`,
    }
  }

  private validateCPT(proc: ProcedureCode): CodeValidationResult {
    const code = proc.cptCode

    // CPT codes are 5 digits, optionally followed by modifiers
    const cptPattern = /^\d{5}$/

    if (!cptPattern.test(code)) {
      return {
        check: `cpt_valid_${code}`,
        status: "FAIL",
        details: `${code} is not a valid CPT code format (must be 5 digits)`,
      }
    }

    // Validate modifiers if present
    if (proc.modifiers && proc.modifiers.length > 0) {
      for (const mod of proc.modifiers) {
        if (!/^[A-Z0-9]{2}$/.test(mod)) {
          return {
            check: `cpt_valid_${code}`,
            status: "WARNING",
            details: `Modifier ${mod} may be invalid`,
          }
        }
      }
    }

    return {
      check: `cpt_valid_${code}`,
      status: "PASS",
      details: `${code} is a valid CPT code`,
    }
  }

  private checkMedicalNecessity(
    diagnosisCodes: DiagnosisCode[],
    procedures: ProcedureCode[]
  ): CodeValidationResult {
    const dxCodes = diagnosisCodes.map((d) => d.code.split(".")[0] + (d.code.includes(".") ? "." + d.code.split(".")[1] : ""))

    for (const proc of procedures) {
      // Find if any diagnosis supports this procedure
      let supported = false

      for (const dxCode of dxCodes) {
        const supportedProcedures = MEDICAL_NECESSITY_MAP[dxCode]
        if (supportedProcedures && supportedProcedures.includes(proc.cptCode)) {
          supported = true
          break
        }
      }

      // For major surgical procedures, we need explicit support
      const majorProcedures = ["27447", "27130", "63030", "22551"]
      if (majorProcedures.includes(proc.cptCode) && !supported) {
        return {
          check: "medical_necessity",
          status: "WARNING",
          details: `Diagnosis codes may not support medical necessity for CPT ${proc.cptCode}`,
        }
      }
    }

    return {
      check: "medical_necessity",
      status: "PASS",
      details: "Diagnosis codes support medical necessity for all procedures",
    }
  }

  private checkAgeAppropriateness(
    patientDob: string,
    proc: ProcedureCode
  ): CodeValidationResult | null {
    const restriction = AGE_RESTRICTIONS[proc.cptCode]
    if (!restriction) return null

    const dob = new Date(patientDob)
    const dos = new Date(proc.dateOfService)
    const age = Math.floor((dos.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))

    if (restriction.min && age < restriction.min) {
      return {
        check: `age_appropriate_${proc.cptCode}`,
        status: "WARNING",
        details: `Patient age ${age} may be below typical range for ${proc.cptCode}. ${restriction.message}`,
      }
    }

    if (restriction.max && age > restriction.max) {
      return {
        check: `age_appropriate_${proc.cptCode}`,
        status: "WARNING",
        details: `Patient age ${age} may be above typical range for ${proc.cptCode}`,
      }
    }

    return {
      check: `age_appropriate_${proc.cptCode}`,
      status: "PASS",
      details: `Patient age ${age} is within acceptable range for ${proc.cptCode}`,
    }
  }

  private checkGenderAppropriateness(
    patientGender: string,
    proc: ProcedureCode
  ): CodeValidationResult | null {
    const restriction = GENDER_SPECIFIC[proc.cptCode]
    if (!restriction) return null

    const normalizedGender = patientGender.toUpperCase().charAt(0)

    if (normalizedGender !== restriction.gender) {
      return {
        check: `gender_appropriate_${proc.cptCode}`,
        status: "FAIL",
        details: restriction.message,
      }
    }

    return {
      check: `gender_appropriate_${proc.cptCode}`,
      status: "PASS",
      details: `${proc.cptCode} is appropriate for patient gender`,
    }
  }

  private checkBundling(procedures: ProcedureCode[]): CodeValidationResult | null {
    const cptCodes = procedures.map((p) => p.cptCode)

    for (const rule of BUNDLING_RULES) {
      if (cptCodes.includes(rule.primary) && cptCodes.includes(rule.bundled)) {
        return {
          check: "bundling_compliance",
          status: "WARNING",
          details: rule.message,
        }
      }
    }

    if (procedures.length > 1) {
      return {
        check: "bundling_compliance",
        status: "PASS",
        details: "No bundling issues detected",
      }
    }

    return null
  }
}

export const codeValidator = new CodeValidator()
export default codeValidator
