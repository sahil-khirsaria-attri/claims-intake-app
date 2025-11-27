import Anthropic from "@anthropic-ai/sdk"

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

class ClaudeAIService {
  private client: Anthropic | null = null
  private model = "claude-sonnet-4-20250514"

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey || apiKey === "your-anthropic-api-key-here") {
        throw new Error("ANTHROPIC_API_KEY is not configured")
      }
      this.client = new Anthropic({ apiKey })
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
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Please extract structured data from the following OCR text:\n\n${ocrText}`,
          },
        ],
        system: systemPrompt,
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON from Claude response")
      }

      const result = JSON.parse(jsonMatch[0]) as ExtractionResult
      return result
    } catch (error) {
      console.error("Claude extraction error:", error)
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
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Classify this document:\n\n${ocrText.substring(0, 3000)}`,
          },
        ],
        system: systemPrompt,
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Failed to parse JSON from Claude response")
      }

      return JSON.parse(jsonMatch[0]) as ClassificationResult
    } catch (error) {
      console.error("Claude classification error:", error)
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

Return a JSON array of suggestions:
[
  {
    "field": "Field name",
    "issue": "Description of the issue",
    "suggestion": "How to fix it",
    "severity": "error" | "warning" | "info"
  }
]`

    try {
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `Validate these extracted fields:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
        system: systemPrompt,
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      const jsonMatch = content.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return []
      }

      return JSON.parse(jsonMatch[0]) as ValidationSuggestion[]
    } catch (error) {
      console.error("Claude validation error:", error)
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
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Generate an 837P EDI transaction for this claim data:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
        system: systemPrompt,
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      return content.text.trim()
    } catch (error) {
      console.error("Claude EDI generation error:", error)
      throw new Error(`EDI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async summarizeClaim(fields: ExtractedFieldResult[]): Promise<string> {
    try {
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `Provide a brief 2-3 sentence summary of this healthcare claim:\n\n${JSON.stringify(fields, null, 2)}`,
          },
        ],
        system: "You are a healthcare claims analyst. Provide concise, professional summaries.",
      })

      const content = response.content[0]
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude")
      }

      return content.text.trim()
    } catch (error) {
      console.error("Claude summary error:", error)
      return "Unable to generate summary"
    }
  }
}

// Singleton instance
const globalForClaude = globalThis as unknown as {
  claude: ClaudeAIService | undefined
}

export const claude = globalForClaude.claude ?? new ClaudeAIService()

if (process.env.NODE_ENV !== "production") globalForClaude.claude = claude

export default claude
