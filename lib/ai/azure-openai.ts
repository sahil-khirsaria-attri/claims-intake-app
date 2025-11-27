import { AzureOpenAI } from "openai"

export interface ExtractedFieldResult {
  category: "patient" | "provider" | "claim" | "codes"
  label: string
  value: string
  confidence: number
}

export interface ExtractionResult {
  fields: ExtractedFieldResult[]
  summary: string
  confidence: number
  warnings: string[]
}

export interface ClassificationResult {
  documentType: string
  confidence: number
  reasoning: string
}

export interface ValidationSuggestion {
  field: string
  issue: string
  suggestion: string
  severity: "error" | "warning" | "info"
}

export interface ExceptionAnalysis {
  summary: string
  rootCauses: Array<{
    issue: string
    explanation: string
    severity: "critical" | "major" | "minor"
  }>
  suggestedFixes: Array<{
    action: string
    description: string
    autoFixable: boolean
    fixValue?: string
  }>
  riskAssessment: {
    denialLikelihood: "high" | "medium" | "low"
    reasoning: string
  }
  recommendedAction: "auto_fix" | "manual_review" | "reject" | "approve_with_warning"
}

export interface ClaimReviewSummary {
  executiveSummary: string
  patientInfo: string
  serviceDetails: string
  financialSummary: string
  validationStatus: string
  riskFactors: string[]
  recommendations: string[]
  priorityLevel: "urgent" | "high" | "normal" | "low"
}

export interface FieldSuggestion {
  fieldId: string
  currentValue: string
  suggestedValues: Array<{
    value: string
    confidence: number
    reasoning: string
  }>
  validationHints: string[]
}

class AzureOpenAIService {
  private client: AzureOpenAI | null = null
  private deployment: string

  constructor() {
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5.1"
  }

  private getClient(): AzureOpenAI {
    if (!this.client) {
      const apiKey = process.env.AZURE_OPENAI_API_KEY
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview"

      if (!apiKey || !endpoint) {
        throw new Error("Azure OpenAI configuration is missing. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT")
      }

      this.client = new AzureOpenAI({
        apiKey,
        endpoint,
        apiVersion,
      })
    }
    return this.client
  }

  async extractFields(ocrText: string, documentType: string): Promise<ExtractionResult> {
    const systemPrompt = `You are an expert medical claims processing AI. Your task is to extract structured data from OCR text of healthcare documents.

Document Type: ${documentType}

Extract the following fields based on document type:

For CMS-1500 forms:
- Patient Information (name, DOB, address, insurance ID, group number)
- Provider Information (NPI, name, address, tax ID)
- Claim Information (date of service, place of service, diagnosis codes, procedure codes)
- Billing Information (charges, units)

For UB-04 forms:
- Patient Information (name, DOB, address, medical record number)
- Facility Information (name, NPI, address)
- Admission/Discharge dates
- Revenue codes, CPT/HCPCS codes, charges

For other medical documents:
- Extract relevant patient, provider, and clinical information

Return a JSON object with this exact structure:
{
  "fields": [
    {
      "category": "patient" | "provider" | "claim" | "codes",
      "label": "Field name",
      "value": "Extracted value",
      "confidence": 0-100
    }
  ],
  "summary": "Brief summary of the document content",
  "confidence": 0-100,
  "warnings": ["List any data quality issues or missing required fields"]
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Please extract structured data from the following OCR text:\n\n${ocrText}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      // Parse the JSON response
      const result = JSON.parse(content) as ExtractionResult
      return result
    } catch (error) {
      console.error("Azure OpenAI extraction error:", error)
      throw new Error(`Field extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async classifyDocument(ocrText: string): Promise<ClassificationResult> {
    const systemPrompt = `You are an expert at classifying healthcare documents. Analyze the OCR text and determine the document type.

Possible document types:
- cms_1500: CMS-1500 Health Insurance Claim Form
- ub_04: UB-04 Uniform Billing Form
- operative_notes: Operative/Surgical Notes
- h_and_p: History and Physical
- prior_auth: Prior Authorization Form
- referral: Referral Form
- medical_records: General Medical Records
- other: Other document type

Return a JSON object:
{
  "documentType": "one of the types above",
  "confidence": 0-100,
  "reasoning": "Brief explanation of why this classification was chosen"
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 1024,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Classify this document:\n\n${ocrText.substring(0, 3000)}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      return JSON.parse(content) as ClassificationResult
    } catch (error) {
      console.error("Azure OpenAI classification error:", error)
      throw new Error(`Document classification failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async validateExtractedData(fields: ExtractedFieldResult[]): Promise<ValidationSuggestion[]> {
    const systemPrompt = `You are a healthcare claims validation expert. Review the extracted fields and identify potential issues.

Check for:
1. Missing required fields
2. Invalid formats (dates, NPI numbers, diagnosis codes, etc.)
3. Logical inconsistencies
4. Data quality issues

Return a JSON object with an array of suggestions:
{
  "suggestions": [
    {
      "field": "Field name",
      "issue": "Description of the issue",
      "suggestion": "How to fix it",
      "severity": "error" | "warning" | "info"
    }
  ]
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Validate these extracted fields:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return []
      }

      const result = JSON.parse(content) as { suggestions: ValidationSuggestion[] }
      return result.suggestions || []
    } catch (error) {
      console.error("Azure OpenAI validation error:", error)
      return []
    }
  }

  async generateEDI837(fields: ExtractedFieldResult[]): Promise<string> {
    const systemPrompt = `You are an expert in healthcare EDI transactions. Generate an ANSI X12 837P (Professional) claim based on the extracted fields.

Follow these rules:
1. Use proper segment terminators (~)
2. Use proper element separators (*)
3. Include all required segments (ISA, GS, ST, BHT, etc.)
4. Use realistic but placeholder values for missing required data
5. Format dates as CCYYMMDD
6. Format times as HHMM

Return ONLY the raw EDI content, no explanations.`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Generate an 837P EDI transaction for this claim data:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      return content.trim()
    } catch (error) {
      console.error("Azure OpenAI EDI generation error:", error)
      throw new Error(`EDI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async summarizeClaim(fields: ExtractedFieldResult[]): Promise<string> {
    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content: "You are a healthcare claims analyst. Provide concise, professional summaries.",
          },
          {
            role: "user",
            content: `Provide a brief 2-3 sentence summary of this healthcare claim:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return "Unable to generate summary"
      }

      return content.trim()
    } catch (error) {
      console.error("Azure OpenAI summary error:", error)
      return "Unable to generate summary"
    }
  }

  async analyzeExceptions(
    validationFailures: Array<{ name: string; status: string; message?: string; category?: string }>,
    extractedFields: ExtractedFieldResult[],
    claimContext?: { patientName?: string; memberId?: string; totalCharges?: number }
  ): Promise<ExceptionAnalysis> {
    const systemPrompt = `You are an expert healthcare claims analyst. Analyze validation failures and provide actionable insights.

Your task is to:
1. Identify the root causes of each validation failure
2. Suggest specific fixes that could resolve the issues
3. Assess the risk of claim denial
4. Recommend the best course of action

Be specific and actionable in your suggestions. If a fix can be automated (like formatting corrections), indicate that.

Return a JSON object with this structure:
{
  "summary": "Brief 1-2 sentence summary of the issues",
  "rootCauses": [
    {
      "issue": "Name of the issue",
      "explanation": "Why this is happening",
      "severity": "critical" | "major" | "minor"
    }
  ],
  "suggestedFixes": [
    {
      "action": "What needs to be done",
      "description": "Detailed explanation",
      "autoFixable": true/false,
      "fixValue": "The corrected value if autoFixable"
    }
  ],
  "riskAssessment": {
    "denialLikelihood": "high" | "medium" | "low",
    "reasoning": "Why this assessment"
  },
  "recommendedAction": "auto_fix" | "manual_review" | "reject" | "approve_with_warning"
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze these validation failures and provide recommendations:

Validation Failures:
${JSON.stringify(validationFailures, null, 2)}

Extracted Fields:
${JSON.stringify(extractedFields, null, 2)}

Claim Context:
${JSON.stringify(claimContext || {}, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      return JSON.parse(content) as ExceptionAnalysis
    } catch (error) {
      console.error("Azure OpenAI exception analysis error:", error)
      return {
        summary: "Unable to analyze exceptions automatically",
        rootCauses: [],
        suggestedFixes: [],
        riskAssessment: { denialLikelihood: "medium", reasoning: "Analysis unavailable" },
        recommendedAction: "manual_review",
      }
    }
  }

  async generateReviewSummary(
    claim: {
      id: string
      patientName?: string
      memberId?: string
      status: string
      priority: string
      receivedAt: Date
    },
    extractedFields: ExtractedFieldResult[],
    validationChecks: Array<{ name: string; status: string; message?: string }>
  ): Promise<ClaimReviewSummary> {
    const systemPrompt = `You are a healthcare claims review assistant. Generate a comprehensive summary to help reviewers quickly understand and process claims.

Create a structured summary that includes:
1. Executive summary (2-3 sentences)
2. Patient information summary
3. Service details summary
4. Financial summary
5. Validation status overview
6. Risk factors to watch
7. Specific recommendations for the reviewer
8. Priority level assessment

Return a JSON object:
{
  "executiveSummary": "2-3 sentence overview",
  "patientInfo": "Patient details summary",
  "serviceDetails": "Services and procedures summary",
  "financialSummary": "Charges and billing summary",
  "validationStatus": "Overview of validation results",
  "riskFactors": ["List of risk factors"],
  "recommendations": ["Specific action items for reviewer"],
  "priorityLevel": "urgent" | "high" | "normal" | "low"
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 2048,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate a review summary for this claim:

Claim Info:
${JSON.stringify(claim, null, 2)}

Extracted Fields:
${JSON.stringify(extractedFields, null, 2)}

Validation Results:
${JSON.stringify(validationChecks, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      return JSON.parse(content) as ClaimReviewSummary
    } catch (error) {
      console.error("Azure OpenAI review summary error:", error)
      return {
        executiveSummary: "Unable to generate AI summary",
        patientInfo: "See extracted fields",
        serviceDetails: "See extracted fields",
        financialSummary: "See extracted fields",
        validationStatus: `${validationChecks.filter(c => c.status === "pass").length}/${validationChecks.length} checks passed`,
        riskFactors: [],
        recommendations: ["Review claim manually"],
        priorityLevel: "normal",
      }
    }
  }

  async suggestFieldCorrections(
    field: { id: string; label: string; value: string; category: string; confidence: number },
    relatedFields: ExtractedFieldResult[],
    documentType: string
  ): Promise<FieldSuggestion> {
    const systemPrompt = `You are an expert healthcare data validation specialist. Analyze the field and suggest corrections.

For the given field:
1. Analyze if the current value appears correct
2. Suggest alternative values if the confidence is low or format seems wrong
3. Provide validation hints specific to this field type
4. Consider context from related fields

Common field validations:
- NPI: 10 digits, passes Luhn check
- Date: Valid date in appropriate format
- Diagnosis codes (ICD-10): Letter followed by 2+ digits
- Procedure codes (CPT): 5 digits
- Member ID: Check format consistency
- Names: Proper capitalization

Return a JSON object:
{
  "fieldId": "the field id",
  "currentValue": "current value",
  "suggestedValues": [
    {
      "value": "suggested correct value",
      "confidence": 0-100,
      "reasoning": "why this might be correct"
    }
  ],
  "validationHints": ["Helpful hints for this field type"]
}`

    try {
      const response = await this.getClient().chat.completions.create({
        model: this.deployment,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Suggest corrections for this field:

Field to Analyze:
${JSON.stringify(field, null, 2)}

Document Type: ${documentType}

Related Fields for Context:
${JSON.stringify(relatedFields.slice(0, 10), null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from Azure OpenAI")
      }

      return JSON.parse(content) as FieldSuggestion
    } catch (error) {
      console.error("Azure OpenAI field suggestion error:", error)
      return {
        fieldId: field.id,
        currentValue: field.value,
        suggestedValues: [],
        validationHints: ["Unable to generate suggestions"],
      }
    }
  }
}

// Singleton instance
const globalForAzureOpenAI = globalThis as unknown as {
  azureOpenAI: AzureOpenAIService | undefined
}

export const azureOpenAI = globalForAzureOpenAI.azureOpenAI ?? new AzureOpenAIService()

if (process.env.NODE_ENV !== "production") globalForAzureOpenAI.azureOpenAI = azureOpenAI

export default azureOpenAI
