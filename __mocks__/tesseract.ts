// Mock Tesseract OCR for testing

export const mockOCRResult = {
  text: "HEALTH INSURANCE CLAIM FORM\nPatient Name: John Smith\nMember ID: ABC123456\nDate of Service: 2024-01-15\nProvider NPI: 1234567890\nDiagnosis Code: J06.9\nCPT Code: 99213\nTotal Charges: $150.00",
  confidence: 92.5,
  words: [
    { text: "HEALTH", confidence: 95, bbox: { x0: 10, y0: 10, x1: 100, y1: 30 } },
    { text: "INSURANCE", confidence: 94, bbox: { x0: 110, y0: 10, x1: 200, y1: 30 } },
    { text: "CLAIM", confidence: 93, bbox: { x0: 210, y0: 10, x1: 280, y1: 30 } },
    { text: "FORM", confidence: 96, bbox: { x0: 290, y0: 10, x1: 350, y1: 30 } },
  ],
  blocks: [
    {
      text: "HEALTH INSURANCE CLAIM FORM",
      confidence: 94.5,
      bbox: { x0: 10, y0: 10, x1: 350, y1: 30 },
      paragraphs: [],
    },
  ],
  processingTime: 1500,
}

export const mockQuality = {
  score: 85,
  issues: [],
  suggestions: [],
}

export const mockDocumentType = {
  type: "cms_1500",
  confidence: 95,
  indicators: ["HEALTH INSURANCE CLAIM FORM", "CMS-1500"],
}

export const mockTesseract = {
  initialize: jest.fn().mockResolvedValue(undefined),
  processImage: jest.fn().mockResolvedValue(mockOCRResult),
  processDocument: jest.fn().mockResolvedValue([mockOCRResult]),
  assessQuality: jest.fn().mockResolvedValue(mockQuality),
  detectFormType: jest.fn().mockResolvedValue(mockDocumentType),
  terminate: jest.fn().mockResolvedValue(undefined),
}

jest.mock("@/lib/ocr/tesseract", () => ({
  __esModule: true,
  default: mockTesseract,
  tesseract: mockTesseract,
}))

export default mockTesseract
