// Core types for the Claims Agent application

export type UserRole = "intake_clerk" | "validation_specialist" | "human_reviewer" | "admin"

export type ClaimStatus =
  | "new"
  | "processing"
  | "validation_pending"
  | "validation_complete"
  | "exception"
  | "human_review"
  | "ready_for_submission"
  | "submitted"
  | "rejected"

export type SubmissionChannel = "email" | "fax" | "portal" | "edi"

export type DocumentType =
  | "cms_1500"
  | "ub_04"
  | "operative_notes"
  | "h_and_p"
  | "prior_auth"
  | "referral"
  | "medical_records"
  | "other"

export type ValidationStatus = "pass" | "warning" | "fail" | "pending"

export type Priority = "low" | "medium" | "high" | "urgent"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Document {
  id: string
  name: string
  type: DocumentType
  url: string
  thumbnailUrl?: string
  ocrStatus: "pending" | "processing" | "complete" | "failed"
  classificationConfidence: number
  qualityScore: number
  rawOcrText?: string | null
  uploadedAt: string
}

export interface ExtractedField {
  id: string
  category: "patient" | "provider" | "claim" | "codes"
  label: string
  value: string
  confidence: number
  isEdited: boolean
}

export interface ValidationCheck {
  id: string
  category: "eligibility" | "code" | "business_rule" | "document"
  name: string
  description: string
  status: ValidationStatus
  details?: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  user: User
  details?: string
}

export type PayerStatus = "pending" | "accepted" | "in_review" | "paid" | "denied" | "partial_payment"

export interface PayerTracking {
  status: PayerStatus
  lastUpdated: string
  expectedPaymentDate?: string
  payerName: string
  payerId: string
  trackingEvents: {
    timestamp: string
    status: string
    description: string
  }[]
}

export interface Claim {
  id: string
  submissionChannel: SubmissionChannel
  receivedAt: string
  status: ClaimStatus
  priority: Priority
  assignee?: User
  confidenceScore: number
  documents: Document[]
  extractedFields: ExtractedField[]
  validationChecks: ValidationCheck[]
  auditLog: AuditLogEntry[]
  patientName?: string
  memberId?: string
  totalAmount?: number
  submittedAt?: string
  confirmationNumber?: string
  ediContent?: string
  payerTracking?: PayerTracking
}

export interface DashboardMetrics {
  totalClaims: number
  newClaims: number
  inProgress: number
  exceptions: number
  humanReview: number
  submitted: number
  avgProcessingTime: string
  exceptionRate: number
}
