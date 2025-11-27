// Mock Claude AI for testing

export const mockExtractionResult = {
  fields: [
    { category: "patient", label: "Patient Name", value: "John Smith", confidence: 95 },
    { category: "patient", label: "Member ID", value: "ABC123456", confidence: 92 },
    { category: "patient", label: "Date of Birth", value: "1985-05-15", confidence: 88 },
    { category: "provider", label: "Provider NPI", value: "1234567890", confidence: 96 },
    { category: "provider", label: "Provider Name", value: "Dr. Jane Doe", confidence: 90 },
    { category: "claim", label: "Date of Service", value: "2024-01-15", confidence: 94 },
    { category: "claim", label: "Place of Service", value: "11", confidence: 89 },
    { category: "codes", label: "Diagnosis Code", value: "J06.9", confidence: 91 },
    { category: "codes", label: "CPT Code", value: "99213", confidence: 93 },
    { category: "claim", label: "Total Charges", value: "150.00", confidence: 95 },
  ],
  summary: "Professional claim for office visit with respiratory infection diagnosis",
  confidence: 92,
  warnings: [],
}

export const mockClassificationResult = {
  documentType: "cms_1500",
  confidence: 95,
  reasoning: "Document contains standard CMS-1500 form fields and structure",
}

export const mockValidationSuggestions = [
  {
    field: "Provider NPI",
    issue: "NPI format verified",
    suggestion: "No action required",
    severity: "info",
  },
]

export const mockEDI = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *240115*1200*^*00501*000000001*0*P*:~
GS*HC*SENDER*RECEIVER*20240115*1200*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*000000001*20240115*1200*CH~
NM1*41*2*CLAIMSAI*****46*1234567890~
SE*6*0001~
GE*1*1~
IEA*1*000000001~`

export const mockClaude = {
  extractFields: jest.fn().mockResolvedValue(mockExtractionResult),
  classifyDocument: jest.fn().mockResolvedValue(mockClassificationResult),
  validateExtractedData: jest.fn().mockResolvedValue(mockValidationSuggestions),
  generateEDI837: jest.fn().mockResolvedValue(mockEDI),
  summarizeClaim: jest.fn().mockResolvedValue("Professional claim for office visit"),
}

jest.mock("@/lib/ai/claude", () => ({
  __esModule: true,
  default: mockClaude,
  claude: mockClaude,
}))

export default mockClaude
