/**
 * Document Checker Service
 * Detects missing required documents based on procedure type
 */

export interface MissingDocument {
  document: string
  displayName: string
  required_for: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  reason: string
}

export interface DocumentCheckResult {
  status: "COMPLETE" | "INCOMPLETE" | "WARNING"
  requiredDocuments: string[]
  receivedDocuments: string[]
  missingDocuments: MissingDocument[]
}

// Document types mapped to their display names
const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  prior_authorization: "Prior Authorization",
  operative_notes: "Operative Notes",
  history_and_physical: "History & Physical",
  medical_necessity: "Medical Necessity Documentation",
  referral: "Referral Letter",
  pathology_report: "Pathology Report",
  radiology_report: "Radiology Report",
  lab_results: "Lab Results",
  consent_form: "Consent Form",
  discharge_summary: "Discharge Summary",
}

// Required documents by procedure code
const PROCEDURE_DOCUMENTS: Record<string, { doc: string; priority: "HIGH" | "MEDIUM" | "LOW"; reason: string }[]> = {
  // Total Knee Arthroplasty
  "27447": [
    { doc: "prior_authorization", priority: "HIGH", reason: "Required for surgical procedures" },
    { doc: "operative_notes", priority: "HIGH", reason: "Required for surgical claims" },
    { doc: "history_and_physical", priority: "MEDIUM", reason: "Supports medical necessity" },
    { doc: "medical_necessity", priority: "MEDIUM", reason: "May be requested on audit" },
  ],
  // Total Hip Arthroplasty
  "27130": [
    { doc: "prior_authorization", priority: "HIGH", reason: "Required for surgical procedures" },
    { doc: "operative_notes", priority: "HIGH", reason: "Required for surgical claims" },
    { doc: "history_and_physical", priority: "MEDIUM", reason: "Supports medical necessity" },
    { doc: "medical_necessity", priority: "MEDIUM", reason: "May be requested on audit" },
  ],
  // Lumbar Laminectomy
  "63030": [
    { doc: "prior_authorization", priority: "HIGH", reason: "Required for spinal procedures" },
    { doc: "operative_notes", priority: "HIGH", reason: "Required for surgical claims" },
    { doc: "radiology_report", priority: "HIGH", reason: "MRI/CT required for spinal surgery" },
    { doc: "history_and_physical", priority: "MEDIUM", reason: "Supports medical necessity" },
  ],
  // Cervical Fusion
  "22551": [
    { doc: "prior_authorization", priority: "HIGH", reason: "Required for spinal fusion" },
    { doc: "operative_notes", priority: "HIGH", reason: "Required for surgical claims" },
    { doc: "radiology_report", priority: "HIGH", reason: "Imaging required for spinal surgery" },
    { doc: "history_and_physical", priority: "MEDIUM", reason: "Supports medical necessity" },
  ],
  // Knee Arthroscopy with Meniscectomy
  "29881": [
    { doc: "prior_authorization", priority: "MEDIUM", reason: "May be required by payer" },
    { doc: "operative_notes", priority: "HIGH", reason: "Required for surgical claims" },
    { doc: "radiology_report", priority: "MEDIUM", reason: "MRI typically performed pre-op" },
  ],
  // Upper GI Endoscopy with Biopsy
  "43239": [
    { doc: "pathology_report", priority: "HIGH", reason: "Required when biopsy performed" },
    { doc: "history_and_physical", priority: "MEDIUM", reason: "Supports medical necessity" },
  ],
  // Office Visit E/M codes (minimal documentation needed)
  "99213": [],
  "99214": [],
  "99215": [
    { doc: "history_and_physical", priority: "LOW", reason: "Supports high-level E/M" },
  ],
}

// Document type to internal name mapping
const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
  cms_1500: "cms_1500",
  ub_04: "ub_04",
  operative_notes: "operative_notes",
  h_and_p: "history_and_physical",
  prior_auth: "prior_authorization",
  referral: "referral",
  medical_records: "medical_records",
  other: "other",
}

export class DocumentChecker {
  /**
   * Check for missing required documents based on procedures
   */
  check(
    procedureCodes: string[],
    receivedDocumentTypes: string[]
  ): DocumentCheckResult {
    // Build set of required documents based on procedures
    const requiredDocsMap = new Map<string, { priority: "HIGH" | "MEDIUM" | "LOW"; reason: string; requiredFor: string }>()

    for (const cptCode of procedureCodes) {
      const requiredDocs = PROCEDURE_DOCUMENTS[cptCode] || []
      for (const doc of requiredDocs) {
        // Keep highest priority if document already required
        const existing = requiredDocsMap.get(doc.doc)
        if (!existing || this.priorityValue(doc.priority) > this.priorityValue(existing.priority)) {
          requiredDocsMap.set(doc.doc, {
            priority: doc.priority,
            reason: doc.reason,
            requiredFor: cptCode,
          })
        }
      }
    }

    const requiredDocuments = Array.from(requiredDocsMap.keys())

    // Normalize received document types
    const normalizedReceived = receivedDocumentTypes.map(
      (type) => DOCUMENT_TYPE_MAPPING[type] || type
    )

    // Find missing documents
    const missingDocuments: MissingDocument[] = []
    for (const [docName, info] of requiredDocsMap.entries()) {
      if (!normalizedReceived.includes(docName)) {
        missingDocuments.push({
          document: docName,
          displayName: DOCUMENT_DISPLAY_NAMES[docName] || docName,
          required_for: info.requiredFor,
          priority: info.priority,
          reason: info.reason,
        })
      }
    }

    // Sort missing documents by priority
    missingDocuments.sort((a, b) => this.priorityValue(b.priority) - this.priorityValue(a.priority))

    // Determine status
    const hasHighPriorityMissing = missingDocuments.some((d) => d.priority === "HIGH")
    const hasMediumPriorityMissing = missingDocuments.some((d) => d.priority === "MEDIUM")

    let status: "COMPLETE" | "INCOMPLETE" | "WARNING"
    if (hasHighPriorityMissing) {
      status = "INCOMPLETE"
    } else if (hasMediumPriorityMissing) {
      status = "WARNING"
    } else {
      status = "COMPLETE"
    }

    return {
      status,
      requiredDocuments,
      receivedDocuments: normalizedReceived,
      missingDocuments,
    }
  }

  private priorityValue(priority: "HIGH" | "MEDIUM" | "LOW"): number {
    switch (priority) {
      case "HIGH":
        return 3
      case "MEDIUM":
        return 2
      case "LOW":
        return 1
      default:
        return 0
    }
  }

  /**
   * Get required documents for a specific procedure
   */
  getRequiredDocuments(cptCode: string): string[] {
    const docs = PROCEDURE_DOCUMENTS[cptCode] || []
    return docs.map((d) => d.doc)
  }

  /**
   * Check if a specific document is required for any of the procedures
   */
  isDocumentRequired(docType: string, procedureCodes: string[]): boolean {
    const normalizedDoc = DOCUMENT_TYPE_MAPPING[docType] || docType

    for (const cptCode of procedureCodes) {
      const requiredDocs = PROCEDURE_DOCUMENTS[cptCode] || []
      if (requiredDocs.some((d) => d.doc === normalizedDoc)) {
        return true
      }
    }
    return false
  }
}

export const documentChecker = new DocumentChecker()
export default documentChecker
