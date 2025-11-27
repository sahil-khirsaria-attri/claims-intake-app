# Claims Intake & Validation Agent

## Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** November 2025
**Document Status:** Active

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Industry Standards & Compliance](#3-industry-standards--compliance)
4. [System Architecture](#4-system-architecture)
5. [Core Features](#5-core-features)
6. [AI-Powered Capabilities](#6-ai-powered-capabilities)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Use Cases](#8-use-cases)
9. [API Reference](#9-api-reference)
10. [Data Models](#10-data-models)
11. [Security & Compliance](#11-security--compliance)
12. [Deployment Guide](#12-deployment-guide)
13. [References](#13-references)

---

## 1. Executive Summary

### 1.1 Purpose

The Claims Intake & Validation Agent is an AI-powered healthcare claims processing system designed to automate the intake, validation, and routing of medical claims. The system leverages Azure OpenAI for intelligent document processing, exception analysis, and decision support.

### 1.2 Business Problem

Healthcare claims processing faces significant challenges in 2025:

- **60%** of medical groups report year-over-year increase in claim denials
- **$20 billion** spent annually by providers trying to overturn denials
- **15%** of all claims submitted are initially denied
- **82%** of denials are classified as potentially avoidable
- **46%** of denials caused by missing or inaccurate information

*Sources: [Experian Healthcare State of Claims 2024](https://www.experian.com/blogs/healthcare/state-of-claims-2024-insights-from-survey-findings/), [BDO Healthcare Outlook](https://www.bdo.com/insights/industries/healthcare/how-ai-and-automation-can-support-the-denial-management-process)*

### 1.3 Solution Value Proposition

| Metric | Before AI | After AI Implementation |
|--------|-----------|------------------------|
| Processing Time | 5-7 days | Under 24 hours |
| Manual Touchpoints | 100% | Reduced by 50-70% |
| Straight-Through Processing | 20-30% | 55-65% |
| Claim Errors | Baseline | Reduced by 30%+ |
| First-Pass Acceptance | Baseline | Increased by 25% |

*Source: [Keragon - AI in Healthcare Claims Processing](https://www.keragon.com/blog/ai-in-healthcare-claims-processing)*

---

## 2. Product Overview

### 2.1 System Description

A full-stack web application for healthcare claims processing that combines:

- **Intelligent Document Processing (IDP)** - OCR and AI-powered data extraction
- **Automated Validation Engine** - Rule-based and AI-enhanced claim validation
- **Smart Routing System** - Automatic claim triaging to appropriate queues
- **AI Assistant** - Exception analysis and decision support

### 2.2 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL |
| AI/ML | Azure OpenAI (GPT-4.1) |
| OCR | pdf.js, Azure Document Intelligence (optional) |
| Authentication | JWT, bcrypt |
| Deployment | Vercel, Docker |

### 2.3 Key Stakeholders

| Role | Responsibilities |
|------|------------------|
| Claims Processors | Process incoming claims, review extracted data |
| Claims Reviewers | Handle exceptions and complex cases |
| Supervisors | Monitor queues, assign work, manage escalations |
| Administrators | Configure rules, manage users, system settings |

---

## 3. Industry Standards & Compliance

### 3.1 HIPAA Compliance

The system adheres to Health Insurance Portability and Accountability Act (HIPAA) requirements:

| Requirement | Implementation |
|-------------|----------------|
| Access Controls | Role-based access, JWT authentication |
| Audit Controls | Comprehensive audit logging of all actions |
| Transmission Security | HTTPS/TLS encryption |
| Data Integrity | Input validation, checksums |
| PHI Protection | Encryption at rest and in transit |

*Reference: [CMS Electronic Health Care Claims](https://www.cms.gov/medicare/coding-billing/electronic-billing/electronic-healthcare-claims)*

### 3.2 Claim Form Standards

#### CMS-1500 (Professional Claims)

The CMS-1500 form is used for professional services submitted by physicians and other healthcare providers.

**Key Fields Validated:**
- Patient Information (Name, DOB, Insurance ID)
- Provider Information (NPI, Taxonomy, Address)
- Service Information (CPT/HCPCS codes, ICD-10 diagnoses)
- Billing Information (Charges, Units, Place of Service)

*Reference: [CMS-1500 Claim Form Guide](https://cms1500claimbilling.com/medicare-billing-837p-and-form-cms-1500/)*

#### UB-04 / CMS-1450 (Institutional Claims)

The UB-04 form is used for institutional facility claims (hospitals, outpatient centers).

**Key Fields Validated:**
- Facility Information (Type, NPI, Taxonomy)
- Patient Demographics and Insurance
- Revenue Codes and Service Dates
- Diagnosis and Procedure Codes

*Reference: [UB-04 Form Medical Billing Guide](https://www.medstates.com/ub04-form-medical-billing/)*

### 3.3 EDI Standards

Electronic claims follow HIPAA-mandated standards:

| Standard | Purpose |
|----------|---------|
| ANSI X12N 837P | Professional electronic claims |
| ANSI X12N 837I | Institutional electronic claims |
| NCPDP | Prescription drug claims |

### 3.4 Coding Standards

| Code Set | Purpose | Example |
|----------|---------|---------|
| ICD-10-CM | Diagnosis codes | J06.9 (Acute upper respiratory infection) |
| CPT | Procedure codes | 99213 (Office visit, established patient) |
| HCPCS | Medicare/Medicaid services | G0438 (Annual wellness visit) |
| Revenue Codes | UB-04 billing categories | 0450 (Emergency room) |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Dashboard│  │ Claims  │  │ Review  │  │Settings │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js Routes)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Claims  │  │Documents│  │Validation│ │   AI    │            │
│  │  API    │  │   API   │  │   API   │  │  API    │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Database     │  │   OCR Engine    │  │  Azure OpenAI   │
│   (PostgreSQL)  │  │    (pdf.js)     │  │    (GPT-4.1)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 4.2 Data Flow

```
Document Upload → OCR Processing → Field Extraction → Validation → Routing → Review/Submission

1. INTAKE
   └── Multi-channel document receipt (Upload, Fax, EDI, Portal)

2. PROCESSING
   ├── Document classification
   ├── OCR text extraction
   └── AI field extraction with confidence scores

3. VALIDATION
   ├── Format validation (NPI, dates, codes)
   ├── Business rule validation
   ├── Cross-field validation
   └── AI-powered anomaly detection

4. ROUTING
   ├── Clean Submission Queue (all validations pass)
   ├── Exception Queue (auto-fixable issues)
   └── Human Review Queue (complex issues)

5. REVIEW & SUBMISSION
   ├── AI-assisted review
   ├── Manual corrections
   └── Final submission
```

### 4.3 Directory Structure

```
claims-intake-app/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── claims/               # Claims endpoints
│   │   │   ├── [id]/
│   │   │   │   ├── ai-analysis/  # AI analysis endpoint
│   │   │   │   ├── process/      # Processing endpoint
│   │   │   │   └── validate/     # Validation endpoint
│   │   ├── documents/            # Document endpoints
│   │   ├── fields/               # Field management
│   │   ├── auth/                 # Authentication
│   │   └── metrics/              # Dashboard metrics
│   ├── claims/                   # Claims pages
│   │   └── [id]/                 # Claim detail page
│   ├── dashboard/                # Dashboard page
│   ├── exceptions/               # Exception queue
│   ├── review/                   # Human review queue
│   └── settings/                 # Settings pages
├── components/                   # React components
│   ├── claims/                   # Claim-specific components
│   │   ├── ai-exception-panel.tsx
│   │   ├── ai-review-panel.tsx
│   │   ├── field-extraction-panel.tsx
│   │   └── validation-panel.tsx
│   ├── layout/                   # Layout components
│   └── ui/                       # Shared UI components
├── lib/                          # Utilities and services
│   ├── ai/                       # AI integration
│   │   └── azure-openai.ts       # Azure OpenAI client
│   ├── api/                      # API client
│   ├── ocr/                      # OCR processing
│   └── validation/               # Validation engine
├── prisma/                       # Database schema
└── public/                       # Static assets
```

---

## 5. Core Features

### 5.1 Document Management

#### 5.1.1 Multi-Channel Intake

| Channel | Description | Status |
|---------|-------------|--------|
| Web Upload | Drag-and-drop file upload | ✅ Implemented |
| Portal Submission | Self-service provider portal | ✅ Implemented |
| Fax Integration | Digital fax processing | 🔄 Planned |
| EDI/837 | Electronic data interchange | 🔄 Planned |

#### 5.1.2 Supported Document Types

| Document Type | Form ID | Use Case |
|---------------|---------|----------|
| CMS-1500 | Professional | Physician/provider claims |
| UB-04 | CMS-1450 | Hospital/institutional claims |
| Explanation of Benefits | EOB | Insurance correspondence |
| Supporting Documents | Various | Medical records, authorizations |

#### 5.1.3 OCR Processing

The system uses intelligent OCR with the following capabilities:

- **Text Extraction**: PDF parsing with pdf.js
- **Field Detection**: AI-powered field identification
- **Confidence Scoring**: Each extracted field has a confidence percentage
- **Quality Enhancement**: Auto-enhancement for scanned documents

*Reference: [OCR Solutions - Medical Claims](https://ocrsolutions.com/medical-claims/)*

### 5.2 Field Extraction

#### 5.2.1 Extracted Field Categories

| Category | Fields |
|----------|--------|
| **Patient** | Name, DOB, Gender, Address, Member ID, Group Number |
| **Provider** | Name, NPI, Tax ID, Address, Taxonomy Code |
| **Claim** | Claim Number, Date of Service, Place of Service, Total Charges |
| **Codes** | CPT/HCPCS, ICD-10, Revenue Codes, Modifiers |

#### 5.2.2 Confidence Scoring

| Confidence Level | Threshold | Action |
|------------------|-----------|--------|
| High | ≥90% | Auto-accept |
| Medium | 80-89% | Review recommended |
| Low | <80% | Manual verification required |

### 5.3 Validation Engine

#### 5.3.1 Validation Categories

| Category | Examples |
|----------|----------|
| **Format** | NPI format (10 digits), Date formats, Code formats |
| **Required Fields** | Patient name, Provider NPI, Service dates |
| **Cross-Field** | Service date vs. DOS, Diagnosis code vs. Procedure |
| **Business Rules** | Prior authorization, Coverage verification |
| **Payer-Specific** | Medicare/Medicaid requirements |

#### 5.3.2 Validation Rules Examples

```typescript
// NPI Validation
{
  name: "npi_format",
  description: "NPI must be 10 digits and pass Luhn check",
  category: "format",
  severity: "error"
}

// Date Validation
{
  name: "service_date_range",
  description: "Service date cannot be in the future",
  category: "business_rule",
  severity: "error"
}

// Coverage Validation
{
  name: "member_eligibility",
  description: "Member must be eligible on date of service",
  category: "coverage",
  severity: "error"
}
```

### 5.4 Routing System

#### 5.4.1 Routing Queues

| Queue | Criteria | SLA |
|-------|----------|-----|
| **Clean Submission** | All validations pass | Auto-submit |
| **Exception Queue** | Minor issues, auto-fixable | 24 hours |
| **Human Review** | Complex issues, high value | 48 hours |
| **Supervisor Review** | Escalations, high risk | 24 hours |

#### 5.4.2 Routing Logic

```
IF all_validations_pass THEN
    route_to: CLEAN_SUBMISSION
ELSE IF has_auto_fixable_issues AND NOT has_critical_errors THEN
    route_to: EXCEPTION_QUEUE
ELSE IF requires_human_judgment OR has_critical_errors THEN
    route_to: HUMAN_REVIEW
END IF
```

### 5.5 Dashboard & Analytics

#### 5.5.1 Key Metrics

| Metric | Description |
|--------|-------------|
| Claims Today | Total claims received today |
| Processing Rate | Average claims per hour |
| Pending Review | Claims awaiting human review |
| Clean Submission Rate | Percentage of auto-submitted claims |
| Denial Rate | Percentage of denied claims |
| Average Processing Time | Time from intake to submission |

#### 5.5.2 Filtering & Search

| Filter | Options |
|--------|---------|
| Status | Pending, Processing, Validated, Submitted, Exception |
| Priority | Low, Normal, High, Urgent |
| Channel | Upload, Portal, Fax, EDI |
| Date Range | Today, Week, Month, Custom |
| Assignee | Unassigned, Specific user |

---

## 6. AI-Powered Capabilities

### 6.1 AI Integration Overview

The system integrates Azure OpenAI (GPT-4.1) for intelligent claims processing:

*Reference: [AI in Healthcare Claims Processing 2025](https://www.keragon.com/blog/ai-in-healthcare-claims-processing)*

### 6.2 AI-Powered Exception Analysis

#### 6.2.1 Feature Description

When claims fail validation, the AI analyzes the failures and provides:

- **Root Cause Analysis**: Explains why each validation failed
- **Severity Assessment**: Categorizes issues as critical, major, or minor
- **Suggested Fixes**: Provides actionable remediation steps
- **Auto-Fix Indicators**: Identifies which issues can be auto-corrected
- **Risk Assessment**: Predicts denial likelihood
- **Recommended Action**: Suggests next steps

#### 6.2.2 Output Structure

```typescript
interface ExceptionAnalysis {
  summary: string;
  rootCauses: Array<{
    issue: string;
    explanation: string;
    severity: "critical" | "major" | "minor";
  }>;
  suggestedFixes: Array<{
    action: string;
    description: string;
    autoFixable: boolean;
    fixValue?: string;
  }>;
  riskAssessment: {
    denialLikelihood: "high" | "medium" | "low";
    reasoning: string;
  };
  recommendedAction: "auto_fix" | "manual_review" | "reject" | "approve_with_warning";
}
```

#### 6.2.3 Use Case Example

**Scenario**: Claim with invalid NPI format

```json
{
  "summary": "The claim has 2 validation failures related to provider identification...",
  "rootCauses": [
    {
      "issue": "Invalid NPI Format",
      "explanation": "The provider NPI '123456789' is only 9 digits. NPIs must be exactly 10 digits and pass the Luhn check algorithm.",
      "severity": "critical"
    }
  ],
  "suggestedFixes": [
    {
      "action": "Correct NPI",
      "description": "Add the missing digit. Based on the provider name, the correct NPI appears to be '1234567893'.",
      "autoFixable": true,
      "fixValue": "1234567893"
    }
  ],
  "riskAssessment": {
    "denialLikelihood": "high",
    "reasoning": "Invalid NPI will cause immediate rejection by all payers."
  },
  "recommendedAction": "auto_fix"
}
```

### 6.3 AI Review Assistant

#### 6.3.1 Feature Description

Generates comprehensive claim summaries for human reviewers:

- **Executive Summary**: High-level overview of the claim
- **Patient Information**: Summarized patient demographics
- **Service Details**: Description of services rendered
- **Financial Summary**: Breakdown of charges and expected reimbursement
- **Risk Factors**: Potential issues that may affect processing
- **Recommendations**: Suggested actions for the reviewer

#### 6.3.2 Output Structure

```typescript
interface ClaimReviewSummary {
  executiveSummary: string;
  patientInfo: string;
  serviceDetails: string;
  financialSummary: string;
  validationStatus: string;
  riskFactors: string[];
  recommendations: string[];
  priorityLevel: "urgent" | "high" | "normal" | "low";
}
```

#### 6.3.3 Use Case Example

**Scenario**: Complex claim requiring human review

```json
{
  "executiveSummary": "Emergency room visit claim for John Doe with multiple diagnostic codes. Total charges $3,450. Two validation warnings require attention.",
  "patientInfo": "John Doe, Male, DOB 05/15/1978, Member ID: ABC123456, Group: CORP001",
  "serviceDetails": "ER visit (99285) on 11/20/2025 with chest pain evaluation. Includes EKG (93000), chest X-ray (71046), and lab work.",
  "financialSummary": "Total billed: $3,450.00. Expected reimbursement: $2,890.00 based on fee schedule. Patient responsibility estimated at $560.00.",
  "riskFactors": [
    "High-value claim may require additional documentation",
    "Multiple diagnosis codes - ensure medical necessity"
  ],
  "recommendations": [
    "Verify medical necessity documentation is complete",
    "Confirm prior authorization if required by payer"
  ],
  "priorityLevel": "high"
}
```

### 6.4 Smart Field Suggestions

#### 6.4.1 Feature Description

For fields with low confidence (<80%), the AI provides:

- **Alternative Values**: Suggested corrections based on context
- **Confidence Scores**: Likelihood each suggestion is correct
- **Reasoning**: Explanation of why each suggestion was made
- **Validation Hints**: Tips for verifying the correct value

#### 6.4.2 Output Structure

```typescript
interface FieldSuggestion {
  fieldId: string;
  currentValue: string;
  suggestedValues: Array<{
    value: string;
    confidence: number;
    reasoning: string;
  }>;
  validationHints: string[];
}
```

#### 6.4.3 Use Case Example

**Scenario**: OCR extracted patient name with 65% confidence

```json
{
  "fieldId": "patient_name",
  "currentValue": "JOHN D0E",
  "suggestedValues": [
    {
      "value": "JOHN DOE",
      "confidence": 95,
      "reasoning": "The '0' (zero) appears to be a misread 'O'. 'DOE' is a common surname."
    },
    {
      "value": "JOHN DORE",
      "confidence": 15,
      "reasoning": "Alternative interpretation if the character is 'R' not 'O'."
    }
  ],
  "validationHints": [
    "Cross-reference with Member ID lookup",
    "Check against insurance card image if available"
  ]
}
```

### 6.5 AI Performance Metrics

| Metric | Target | Industry Benchmark |
|--------|--------|-------------------|
| Suggestion Accuracy | >90% | 85% |
| Processing Time | <5 seconds | 10 seconds |
| False Positive Rate | <5% | 10% |
| User Acceptance Rate | >70% | 60% |

---

## 7. User Roles & Permissions

### 7.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | System administrators | Full access |
| **Supervisor** | Team leads, queue managers | View all, manage assignments |
| **Processor** | Claims processors | Process assigned claims |
| **Reviewer** | Senior processors | Handle exceptions and reviews |
| **Auditor** | Compliance officers | Read-only, full audit access |

### 7.2 Permission Matrix

| Action | Admin | Supervisor | Processor | Reviewer | Auditor |
|--------|-------|------------|-----------|----------|---------|
| View Claims | ✅ | ✅ | ✅ (assigned) | ✅ | ✅ |
| Edit Claims | ✅ | ✅ | ✅ (assigned) | ✅ | ❌ |
| Delete Claims | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit Claims | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ✅ | ✅ |
| Configure Rules | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ (limited) | ✅ | ✅ |

---

## 8. Use Cases

### 8.1 UC-001: Process New Claim

**Actor**: Claims Processor
**Precondition**: User is logged in, claim is in queue
**Trigger**: User selects claim from queue

**Main Flow**:
1. System displays claim details with extracted fields
2. User reviews extracted data
3. User corrects any errors (assisted by AI suggestions)
4. User triggers validation
5. System validates claim against rules
6. If valid, user submits claim
7. System routes claim to submission queue

**Alternative Flow (Validation Fails)**:
5a. System displays validation errors
5b. AI provides exception analysis
5c. User applies suggested fixes
5d. User re-validates
5e. Continue from step 6

### 8.2 UC-002: Handle Exception

**Actor**: Claims Reviewer
**Precondition**: Claim is in exception queue
**Trigger**: Reviewer selects claim from exception queue

**Main Flow**:
1. System displays claim with AI exception analysis
2. Reviewer reviews root causes and suggested fixes
3. Reviewer applies auto-fixes where appropriate
4. Reviewer manually corrects remaining issues
5. Reviewer re-validates claim
6. Reviewer approves or routes for supervisor review
7. System updates claim status

### 8.3 UC-003: Review High-Value Claim

**Actor**: Supervisor
**Precondition**: Claim exceeds value threshold
**Trigger**: Claim auto-escalated or manually escalated

**Main Flow**:
1. System displays claim with AI review summary
2. Supervisor reviews executive summary
3. Supervisor reviews risk factors
4. Supervisor verifies documentation
5. Supervisor approves or rejects claim
6. System logs decision with audit trail

### 8.4 UC-004: Upload Supporting Document

**Actor**: Claims Processor
**Precondition**: Claim exists, user has edit permission
**Trigger**: User clicks "Upload Document"

**Main Flow**:
1. User selects file to upload
2. User specifies document type
3. System uploads and processes document
4. System extracts text via OCR
5. System extracts fields and updates claim
6. System displays updated claim with new fields

### 8.5 UC-005: Generate Analytics Report

**Actor**: Supervisor
**Precondition**: User has reporting access
**Trigger**: User navigates to dashboard

**Main Flow**:
1. System displays key metrics
2. User applies filters (date range, status, etc.)
3. System updates metrics based on filters
4. User exports report if needed
5. System generates downloadable report

---

## 9. API Reference

### 9.1 Claims API

#### GET /api/claims

List claims with filtering and pagination.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| status | string | Filter by status |
| priority | string | Filter by priority |
| channel | string | Filter by submission channel |
| dateRange | string | Filter by date range |
| search | string | Search term |
| assigneeId | string | Filter by assignee |

**Response**:
```json
{
  "data": [...claims],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### GET /api/claims/:id

Get single claim with all related data.

**Response**:
```json
{
  "id": "claim_123",
  "claimNumber": "CLM-2025-001234",
  "status": "pending_review",
  "documents": [...],
  "extractedFields": [...],
  "validationChecks": [...],
  "auditLog": [...]
}
```

#### POST /api/claims

Create new claim.

**Request Body**:
```json
{
  "submissionChannel": "upload",
  "priority": "normal",
  "patientName": "John Doe",
  "memberId": "ABC123456"
}
```

#### PATCH /api/claims/:id

Update claim.

**Request Body**:
```json
{
  "status": "submitted",
  "assigneeId": "user_123"
}
```

#### POST /api/claims/:id/process

Process claim (OCR + extraction + validation).

**Response**:
```json
{
  "success": true,
  "routing": {
    "queue": "CLEAN_SUBMISSION",
    "reason": "All validations passed"
  }
}
```

#### POST /api/claims/:id/validate

Run validation on claim.

**Response**:
```json
{
  "success": true,
  "results": [
    {
      "name": "npi_format",
      "status": "pass",
      "message": "Provider NPI is valid"
    }
  ]
}
```

### 9.2 AI Analysis API

#### GET /api/claims/:id/ai-analysis

Get AI analysis for claim.

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | "exceptions", "review", or "both" |

**Response**:
```json
{
  "exceptionAnalysis": {
    "summary": "...",
    "rootCauses": [...],
    "suggestedFixes": [...],
    "riskAssessment": {...},
    "recommendedAction": "auto_fix"
  },
  "reviewSummary": {
    "executiveSummary": "...",
    "patientInfo": "...",
    "serviceDetails": "...",
    "financialSummary": "...",
    "validationStatus": "...",
    "riskFactors": [...],
    "recommendations": [...],
    "priorityLevel": "normal"
  }
}
```

### 9.3 Fields API

#### GET /api/fields/:id/suggestions

Get AI suggestions for field.

**Response**:
```json
{
  "fieldId": "field_123",
  "currentValue": "JOHN D0E",
  "suggestedValues": [
    {
      "value": "JOHN DOE",
      "confidence": 95,
      "reasoning": "OCR correction for zero vs O"
    }
  ],
  "validationHints": [
    "Cross-reference with Member ID"
  ]
}
```

#### PATCH /api/fields/:id

Update field value.

**Request Body**:
```json
{
  "value": "JOHN DOE"
}
```

### 9.4 Documents API

#### POST /api/documents

Upload document.

**Request Body** (multipart/form-data):
| Field | Type | Description |
|-------|------|-------------|
| file | File | Document file |
| claimId | string | Associated claim ID |
| type | string | Document type |

**Response**:
```json
{
  "id": "doc_123",
  "filename": "cms_1500.pdf",
  "type": "cms_1500",
  "status": "processing"
}
```

---

## 10. Data Models

### 10.1 Claim Model

```prisma
model Claim {
  id                String            @id @default(cuid())
  claimNumber       String            @unique
  status            ClaimStatus       @default(pending)
  priority          Priority          @default(normal)
  submissionChannel SubmissionChannel @default(upload)

  // Patient Information
  patientName       String?
  patientDob        DateTime?
  memberId          String?
  groupNumber       String?

  // Provider Information
  providerName      String?
  providerNpi       String?
  facilityName      String?

  // Claim Details
  dateOfService     DateTime?
  totalCharges      Decimal?

  // Relationships
  documents         Document[]
  extractedFields   ExtractedField[]
  validationChecks  ValidationCheck[]
  auditLog          AuditEntry[]

  // Assignment
  assigneeId        String?
  assignee          User?             @relation(fields: [assigneeId], references: [id])

  // Timestamps
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}
```

### 10.2 Document Model

```prisma
model Document {
  id            String         @id @default(cuid())
  claimId       String
  claim         Claim          @relation(fields: [claimId], references: [id])

  filename      String
  originalName  String
  mimeType      String
  size          Int
  type          DocumentType   @default(other)
  status        DocumentStatus @default(pending)

  ocrText       String?
  ocrConfidence Float?

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}
```

### 10.3 Extracted Field Model

```prisma
model ExtractedField {
  id            String   @id @default(cuid())
  claimId       String
  claim         Claim    @relation(fields: [claimId], references: [id])
  documentId    String?

  category      String   // patient, provider, claim, codes
  fieldName     String
  label         String
  value         String
  confidence    Float
  isEdited      Boolean  @default(false)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 10.4 Validation Check Model

```prisma
model ValidationCheck {
  id          String           @id @default(cuid())
  claimId     String
  claim       Claim            @relation(fields: [claimId], references: [id])

  name        String
  category    String
  status      ValidationStatus // pass, fail, warning
  message     String
  details     Json?

  createdAt   DateTime         @default(now())
}
```

### 10.5 Enumerations

```prisma
enum ClaimStatus {
  pending
  processing
  validated
  submitted
  exception
  human_review
  denied
  completed
}

enum Priority {
  low
  normal
  high
  urgent
}

enum SubmissionChannel {
  upload
  portal
  fax
  edi
  email
}

enum DocumentType {
  cms_1500
  ub_04
  eob
  medical_record
  authorization
  other
}

enum ValidationStatus {
  pass
  fail
  warning
}
```

---

## 11. Security & Compliance

### 11.1 Authentication & Authorization

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT tokens with bcrypt password hashing |
| Session Management | Secure HTTP-only cookies |
| Password Policy | Minimum 8 characters, complexity requirements |
| MFA | Planned for future release |
| RBAC | Role-based access control |

### 11.2 Data Protection

| Requirement | Implementation |
|-------------|----------------|
| Encryption in Transit | TLS 1.3 |
| Encryption at Rest | AES-256 (database) |
| PHI Handling | Encrypted storage, access logging |
| Data Retention | Configurable retention policies |
| Data Backup | Daily automated backups |

### 11.3 Audit Logging

All user actions are logged:

```typescript
interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: object;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

**Logged Actions**:
- Login/Logout
- Claim views and edits
- Document uploads and deletions
- Field modifications
- Status changes
- Submissions

### 11.4 Compliance Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| HIPAA Privacy Rule | ✅ | PHI protection implemented |
| HIPAA Security Rule | ✅ | Technical safeguards in place |
| HIPAA Breach Notification | ✅ | Incident response procedures |
| EDI Standards | ✅ | HIPAA X12 compliant |
| State Regulations | 🔄 | Varies by state |

---

## 12. Deployment Guide

### 12.1 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Azure OpenAI API access
- Vercel account (for deployment)

### 12.2 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
JWT_SECRET="your-secret-key"
NEXTAUTH_SECRET="your-nextauth-secret"

# Azure OpenAI
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
AZURE_OPENAI_API_KEY="your-api-key"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4"
AZURE_OPENAI_API_VERSION="2024-02-15-preview"

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### 12.3 Installation

```bash
# Clone repository
git clone https://github.com/your-org/claims-intake-app.git
cd claims-intake-app

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Build application
npm run build

# Start production server
npm start
```

### 12.4 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### 12.5 Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 13. References

### Industry Standards & Guidelines

1. [CMS Electronic Health Care Claims](https://www.cms.gov/medicare/coding-billing/electronic-billing/electronic-healthcare-claims) - Official CMS guidance
2. [Medicare Claims Processing Manual](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/clm104c26pdf.pdf) - Chapter 26
3. [CMS-1500 Claim Form Guide](https://cms1500claimbilling.com/medicare-billing-837p-and-form-cms-1500/)
4. [UB-04 Form Medical Billing Guide](https://www.medstates.com/ub04-form-medical-billing/)

### AI & Automation

5. [AI in Healthcare Claims Processing 2025](https://www.keragon.com/blog/ai-in-healthcare-claims-processing) - Keragon
6. [AI and Algorithms in Medical Claims](https://aihc-assn.org/ai-and-algorithms-an-effective-approach-to-medical-claims-processing/) - AIHC
7. [AI for Healthcare Claims: Ultimate Payer's Guide](https://nanonets.com/blog/ai-healthcare-claims-processing/) - Nanonets

### Healthcare Industry Research

8. [State of Claims 2024](https://www.experian.com/blogs/healthcare/state-of-claims-2024-insights-from-survey-findings/) - Experian Health
9. [Enhancing Healthcare Claims Processing 2025](https://www.experian.com/blogs/healthcare/4-ways-to-improve-healthcare-claims-processing-in-2023/) - Experian Health
10. [Healthcare Claims Processing Workflow](https://www.keragon.com/blog/healthcare-claims-processing-workflow) - Keragon

### OCR & Document Processing

11. [OCR Solutions - Medical Claims](https://ocrsolutions.com/medical-claims/) - OCR Solutions
12. [Intelligent OCR for Medical Records](https://www.wisedocs.ai/blogs/understanding-intelligent-ocr-and-how-its-applied-to-medical-records-for-claims) - WiseDocs
13. [OCR for Healthcare Data Extraction](https://www.docsumo.com/blogs/ocr/healthcare) - Docsumo

### Denial Management

14. [AI and Automation for Claim Denials](https://www.experian.com/blogs/healthcare/prevent-claim-denials-with-ai-and-automation/) - Experian Health
15. [How AI Supports Denial Management](https://www.bdo.com/insights/industries/healthcare/how-ai-and-automation-can-support-the-denial-management-process) - BDO
16. [Denial Management Software Features](https://www.matellio.com/blog/denial-management-software-development/) - Matellio

### Compliance & Regulation

17. [FICO Healthcare Claims Strategies 2024](https://www.fico.com/blogs/five-emerging-strategies-healthcare-claims-processing-2024)
18. [Healthcare Claims Key Features](https://orases.com/blog/key-features-to-look-for-healthcare-claims-management-software/) - Orases

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **837P** | Electronic format for professional claims (physician) |
| **837I** | Electronic format for institutional claims (hospital) |
| **CMS-1500** | Paper claim form for professional services |
| **UB-04** | Paper claim form for institutional services |
| **CPT** | Current Procedural Terminology - procedure codes |
| **HCPCS** | Healthcare Common Procedure Coding System |
| **ICD-10** | International Classification of Diseases, 10th revision |
| **NPI** | National Provider Identifier - 10-digit provider ID |
| **EDI** | Electronic Data Interchange |
| **EOB** | Explanation of Benefits |
| **PHI** | Protected Health Information |
| **STP** | Straight-Through Processing |
| **OCR** | Optical Character Recognition |
| **IDP** | Intelligent Document Processing |

---

## Appendix B: Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 2025 | Development Team | Initial release |

---

*This document is proprietary and confidential. For internal use only.*
