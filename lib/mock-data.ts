import type { Claim, User, DashboardMetrics } from "./types"

export const currentUser: User = {
  id: "user-1",
  name: "Sarah Johnson",
  email: "sarah.johnson@claimsai.com",
  role: "validation_specialist",
  avatar: "/professional-woman-avatar.png",
}

export const mockUsers: User[] = [
  currentUser,
  { id: "user-2", name: "Michael Chen", email: "michael.chen@claimsai.com", role: "human_reviewer" },
  { id: "user-3", name: "Emily Davis", email: "emily.davis@claimsai.com", role: "intake_clerk" },
  { id: "user-4", name: "Robert Wilson", email: "robert.wilson@claimsai.com", role: "admin" },
]

export const mockClaims: Claim[] = [
  {
    id: "CLM-2024-001847",
    submissionChannel: "portal",
    receivedAt: "2024-01-15T09:23:00Z",
    status: "validation_complete",
    priority: "high",
    assignee: currentUser,
    confidenceScore: 94,
    patientName: "John Martinez",
    memberId: "MBR-789456123",
    totalAmount: 2450.0,
    documents: [
      {
        id: "doc-1",
        name: "CMS-1500_claim_form.pdf",
        type: "cms_1500",
        url: "/docs/cms-1500.pdf",
        ocrStatus: "complete",
        classificationConfidence: 98,
        qualityScore: 95,
        uploadedAt: "2024-01-15T09:23:00Z",
      },
      {
        id: "doc-2",
        name: "operative_notes.pdf",
        type: "operative_notes",
        url: "/docs/op-notes.pdf",
        ocrStatus: "complete",
        classificationConfidence: 92,
        qualityScore: 88,
        uploadedAt: "2024-01-15T09:23:00Z",
      },
    ],
    extractedFields: [
      { id: "f1", category: "patient", label: "Patient Name", value: "John Martinez", confidence: 99, isEdited: false },
      { id: "f2", category: "patient", label: "Date of Birth", value: "1985-03-22", confidence: 98, isEdited: false },
      { id: "f3", category: "patient", label: "Member ID", value: "MBR-789456123", confidence: 97, isEdited: false },
      {
        id: "f4",
        category: "provider",
        label: "Provider Name",
        value: "Dr. Amanda Foster",
        confidence: 96,
        isEdited: false,
      },
      { id: "f5", category: "provider", label: "NPI", value: "1234567890", confidence: 99, isEdited: false },
      { id: "f6", category: "claim", label: "Service Date", value: "2024-01-10", confidence: 98, isEdited: false },
      { id: "f7", category: "codes", label: "ICD-10 Code", value: "M54.5", confidence: 94, isEdited: false },
      { id: "f8", category: "codes", label: "CPT Code", value: "99213", confidence: 92, isEdited: false },
      { id: "f9", category: "codes", label: "Amount", value: "$2,450.00", confidence: 99, isEdited: false },
    ],
    validationChecks: [
      {
        id: "v1",
        category: "eligibility",
        name: "Coverage Active",
        description: "Member coverage is active",
        status: "pass",
      },
      {
        id: "v2",
        category: "eligibility",
        name: "Network Status",
        description: "Provider is in-network",
        status: "pass",
      },
      {
        id: "v3",
        category: "eligibility",
        name: "Prior Authorization",
        description: "Prior auth verified",
        status: "pass",
      },
      { id: "v4", category: "code", name: "ICD-10 Validity", description: "Diagnosis code is valid", status: "pass" },
      { id: "v5", category: "code", name: "CPT Validity", description: "Procedure code is valid", status: "pass" },
      {
        id: "v5b",
        category: "code",
        name: "Code Bundling Check",
        description: "Check for potential code bundling issues",
        status: "warning",
        details: "CPT 99213 may be bundled with 99214 - review medical necessity documentation",
      },
      {
        id: "v6",
        category: "business_rule",
        name: "Timely Filing",
        description: "Within filing deadline",
        status: "pass",
      },
      {
        id: "v7",
        category: "business_rule",
        name: "Duplicate Check",
        description: "No duplicate claims found",
        status: "pass",
      },
      {
        id: "v7b",
        category: "business_rule",
        name: "Referring Provider",
        description: "Referring provider information required",
        status: "warning",
        details: "Missing referring provider NPI - required for specialist consultations",
      },
      {
        id: "v8",
        category: "document",
        name: "Operative Notes",
        description: "Required documentation present",
        status: "pass",
      },
    ],
    auditLog: [
      { id: "a1", timestamp: "2024-01-15T09:23:00Z", action: "Claim received via portal", user: mockUsers[2] },
      { id: "a2", timestamp: "2024-01-15T09:25:00Z", action: "OCR processing started", user: mockUsers[2] },
      { id: "a3", timestamp: "2024-01-15T09:28:00Z", action: "OCR processing complete", user: mockUsers[2] },
      { id: "a4", timestamp: "2024-01-15T09:30:00Z", action: "Validation started", user: currentUser },
      { id: "a5", timestamp: "2024-01-15T09:35:00Z", action: "All validations passed", user: currentUser },
    ],
  },
  {
    id: "CLM-2024-001846",
    submissionChannel: "email",
    receivedAt: "2024-01-15T08:45:00Z",
    status: "human_review",
    priority: "urgent",
    assignee: mockUsers[1],
    confidenceScore: 72,
    patientName: "Lisa Thompson",
    memberId: "MBR-456789012",
    totalAmount: 8750.0,
    documents: [
      {
        id: "doc-3",
        name: "UB-04_claim_form.pdf",
        type: "ub_04",
        url: "/docs/ub-04.pdf",
        ocrStatus: "complete",
        classificationConfidence: 89,
        qualityScore: 78,
        uploadedAt: "2024-01-15T08:45:00Z",
      },
    ],
    extractedFields: [
      {
        id: "f10",
        category: "patient",
        label: "Patient Name",
        value: "Lisa Thompson",
        confidence: 95,
        isEdited: false,
      },
      { id: "f11", category: "patient", label: "Date of Birth", value: "1972-08-14", confidence: 88, isEdited: false },
      { id: "f12", category: "patient", label: "Member ID", value: "MBR-456789012", confidence: 91, isEdited: false },
      {
        id: "f13",
        category: "provider",
        label: "Facility Name",
        value: "Metro General Hospital",
        confidence: 94,
        isEdited: false,
      },
      { id: "f14", category: "codes", label: "ICD-10 Code", value: "K80.10", confidence: 68, isEdited: false },
      { id: "f15", category: "codes", label: "Amount", value: "$8,750.00", confidence: 97, isEdited: false },
    ],
    validationChecks: [
      {
        id: "v9",
        category: "eligibility",
        name: "Coverage Active",
        description: "Member coverage is active",
        status: "pass",
      },
      {
        id: "v10",
        category: "eligibility",
        name: "Prior Authorization",
        description: "Prior auth required but not found",
        status: "fail",
        details: "Inpatient stay requires prior authorization",
      },
      { id: "v11", category: "code", name: "ICD-10 Validity", description: "Diagnosis code is valid", status: "pass" },
      {
        id: "v12",
        category: "document",
        name: "H&P Report",
        description: "Required documentation missing",
        status: "fail",
        details: "History & Physical report required for inpatient claims",
      },
    ],
    auditLog: [
      { id: "a6", timestamp: "2024-01-15T08:45:00Z", action: "Claim received via email", user: mockUsers[2] },
      { id: "a7", timestamp: "2024-01-15T08:50:00Z", action: "Routed to human review", user: currentUser },
    ],
  },
  {
    id: "CLM-2024-001845",
    submissionChannel: "fax",
    receivedAt: "2024-01-15T07:30:00Z",
    status: "exception",
    priority: "medium",
    confidenceScore: 45,
    patientName: "Robert Garcia",
    memberId: "MBR-321654987",
    totalAmount: 1200.0,
    documents: [
      {
        id: "doc-4",
        name: "fax_document.pdf",
        type: "cms_1500",
        url: "/docs/fax.pdf",
        ocrStatus: "complete",
        classificationConfidence: 65,
        qualityScore: 52,
        uploadedAt: "2024-01-15T07:30:00Z",
      },
    ],
    extractedFields: [
      {
        id: "f16",
        category: "patient",
        label: "Patient Name",
        value: "Robert Garcia",
        confidence: 78,
        isEdited: false,
      },
      { id: "f17", category: "patient", label: "Date of Birth", value: "1990-??-15", confidence: 45, isEdited: false },
      { id: "f18", category: "codes", label: "CPT Code", value: "99???", confidence: 38, isEdited: false },
    ],
    validationChecks: [
      {
        id: "v13",
        category: "eligibility",
        name: "Coverage Active",
        description: "Unable to verify coverage",
        status: "warning",
        details: "Member ID partially unreadable",
      },
      {
        id: "v14",
        category: "code",
        name: "CPT Validity",
        description: "Procedure code unreadable",
        status: "fail",
        details: "OCR confidence too low",
      },
      {
        id: "v15",
        category: "document",
        name: "Document Quality",
        description: "Poor scan quality detected",
        status: "fail",
        details: "Fax quality below threshold",
      },
    ],
    auditLog: [
      { id: "a8", timestamp: "2024-01-15T07:30:00Z", action: "Claim received via fax", user: mockUsers[2] },
      { id: "a9", timestamp: "2024-01-15T07:35:00Z", action: "Sent to exception queue", user: mockUsers[2] },
    ],
  },
  {
    id: "CLM-2024-001844",
    submissionChannel: "edi",
    receivedAt: "2024-01-15T06:15:00Z",
    status: "submitted",
    priority: "low",
    assignee: currentUser,
    confidenceScore: 99,
    patientName: "Jennifer Williams",
    memberId: "MBR-147258369",
    totalAmount: 350.0,
    submittedAt: "2024-01-15T10:00:00Z",
    confirmationNumber: "EDI-2024-98765",
    ediContent: `ISA*00*          *00*          *ZZ*CLAIMSAI       *ZZ*BCBSFL         *240115*1000*^*00501*000000001*0*P*:~
GS*HC*CLAIMSAI*BCBSFL*20240115*1000*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*CLM-2024-001844*20240115*1000*CH~
NM1*41*2*CLAIMSAI MEDICAL*****46*1234567890~
PER*IC*BILLING DEPT*TE*5551234567~
NM1*40*2*BLUE CROSS BLUE SHIELD FL*****46*BCBSFL001~
HL*1**20*1~
NM1*85*1*FOSTER*AMANDA****XX*1234567890~
N3*123 MEDICAL CENTER DR~
N4*MIAMI*FL*33101~
REF*EI*123456789~
HL*2*1*22*0~
SBR*P*18*******CI~
NM1*IL*1*WILLIAMS*JENNIFER****MI*MBR-147258369~
N3*456 PATIENT AVE~
N4*MIAMI*FL*33102~
DMG*D8*19881103*F~
NM1*PR*2*BLUE CROSS BLUE SHIELD FL*****PI*BCBSFL001~
CLM*CLM-2024-001844*350***11:B:1*Y*A*Y*Y~
HI*ABK:Z0000~
LX*1~
SV1*HC:99212*350*UN*1***1~
DTP*472*D8*20240110~
SE*25*0001~
GE*1*1~
IEA*1*000000001~`,
    payerTracking: {
      status: "accepted",
      lastUpdated: "2024-01-16T14:30:00Z",
      expectedPaymentDate: "2024-01-29",
      payerName: "Blue Cross Blue Shield Florida",
      payerId: "BCBSFL001",
      trackingEvents: [
        {
          timestamp: "2024-01-15T10:00:00Z",
          status: "Submitted",
          description: "Claim transmitted via EDI 837P",
        },
        {
          timestamp: "2024-01-15T10:05:00Z",
          status: "Acknowledged",
          description: "999 Acknowledgment received - claim accepted for processing",
        },
        {
          timestamp: "2024-01-16T09:00:00Z",
          status: "In Review",
          description: "Claim under payer review",
        },
        {
          timestamp: "2024-01-16T14:30:00Z",
          status: "Accepted",
          description: "Claim approved for payment - pending disbursement",
        },
      ],
    },
    documents: [
      {
        id: "doc-5",
        name: "edi_837p.x12",
        type: "cms_1500",
        url: "/docs/edi.x12",
        ocrStatus: "complete",
        classificationConfidence: 100,
        qualityScore: 100,
        uploadedAt: "2024-01-15T06:15:00Z",
      },
    ],
    extractedFields: [
      {
        id: "f19",
        category: "patient",
        label: "Patient Name",
        value: "Jennifer Williams",
        confidence: 100,
        isEdited: false,
      },
      { id: "f20", category: "patient", label: "Date of Birth", value: "1988-11-03", confidence: 100, isEdited: false },
      { id: "f21", category: "codes", label: "CPT Code", value: "99212", confidence: 100, isEdited: false },
      { id: "f22", category: "codes", label: "Amount", value: "$350.00", confidence: 100, isEdited: false },
    ],
    validationChecks: [
      {
        id: "v16",
        category: "eligibility",
        name: "Coverage Active",
        description: "Member coverage is active",
        status: "pass",
      },
      { id: "v17", category: "code", name: "CPT Validity", description: "Procedure code is valid", status: "pass" },
      {
        id: "v18",
        category: "business_rule",
        name: "All Rules",
        description: "All business rules passed",
        status: "pass",
      },
    ],
    auditLog: [
      { id: "a10", timestamp: "2024-01-15T06:15:00Z", action: "Claim received via EDI", user: mockUsers[2] },
      { id: "a11", timestamp: "2024-01-15T06:16:00Z", action: "Auto-validation complete", user: mockUsers[2] },
      { id: "a12", timestamp: "2024-01-15T10:00:00Z", action: "Submitted to payer", user: currentUser },
    ],
  },
  {
    id: "CLM-2024-001843",
    submissionChannel: "portal",
    receivedAt: "2024-01-14T16:30:00Z",
    status: "new",
    priority: "medium",
    confidenceScore: 0,
    patientName: "David Brown",
    memberId: "MBR-963852741",
    totalAmount: 1850.0,
    documents: [],
    extractedFields: [],
    validationChecks: [],
    auditLog: [
      { id: "a13", timestamp: "2024-01-14T16:30:00Z", action: "Claim received via portal", user: mockUsers[2] },
    ],
  },
  {
    id: "CLM-2024-001842",
    submissionChannel: "email",
    receivedAt: "2024-01-14T14:20:00Z",
    status: "processing",
    priority: "high",
    confidenceScore: 0,
    patientName: "Maria Santos",
    memberId: "MBR-852963741",
    totalAmount: 4200.0,
    documents: [
      {
        id: "doc-6",
        name: "claim_docs.pdf",
        type: "cms_1500",
        url: "/docs/claim.pdf",
        ocrStatus: "processing",
        classificationConfidence: 0,
        qualityScore: 0,
        uploadedAt: "2024-01-14T14:20:00Z",
      },
    ],
    extractedFields: [],
    validationChecks: [],
    auditLog: [
      { id: "a14", timestamp: "2024-01-14T14:20:00Z", action: "Claim received via email", user: mockUsers[2] },
      { id: "a15", timestamp: "2024-01-14T14:22:00Z", action: "OCR processing started", user: mockUsers[2] },
    ],
  },
]

export const mockMetrics: DashboardMetrics = {
  totalClaims: 1247,
  newClaims: 23,
  inProgress: 156,
  exceptions: 34,
  humanReview: 18,
  submitted: 1016,
  avgProcessingTime: "4.2 hrs",
  exceptionRate: 2.7,
}
