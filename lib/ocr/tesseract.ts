import Tesseract, { createWorker, Worker, RecognizeResult } from "tesseract.js"

export interface OCRResult {
  text: string
  confidence: number
  words: OCRWord[]
  blocks: OCRBlock[]
  processingTime: number
}

export interface OCRWord {
  text: string
  confidence: number
  bbox: BoundingBox
}

export interface OCRBlock {
  text: string
  confidence: number
  bbox: BoundingBox
  paragraphs: OCRParagraph[]
}

export interface OCRParagraph {
  text: string
  confidence: number
  lines: OCRLine[]
}

export interface OCRLine {
  text: string
  confidence: number
  words: OCRWord[]
}

export interface BoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface DocumentQuality {
  score: number
  issues: string[]
  suggestions: string[]
}

class TesseractOCRService {
  private worker: Worker | null = null
  private isInitializing = false
  private languages: string[]

  constructor() {
    this.languages = (process.env.OCR_LANGUAGES || "eng").split(",")
  }

  async initialize(): Promise<void> {
    if (this.worker || this.isInitializing) return

    this.isInitializing = true
    try {
      this.worker = await createWorker(this.languages.join("+"), 1, {
        logger: (m) => {
          if (process.env.NODE_ENV === "development") {
            console.log(`Tesseract: ${m.status} - ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      console.log("Tesseract OCR worker initialized")
    } catch (error) {
      console.error("Failed to initialize Tesseract worker:", error)
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  async processImage(imageSource: string | Buffer): Promise<OCRResult> {
    await this.ensureWorker()

    const startTime = Date.now()

    try {
      const result = await this.worker!.recognize(imageSource)
      const processingTime = Date.now() - startTime

      return this.parseResult(result, processingTime)
    } catch (error) {
      console.error("OCR processing error:", error)
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async processDocument(images: (string | Buffer)[]): Promise<OCRResult[]> {
    const results: OCRResult[] = []

    for (const image of images) {
      const result = await this.processImage(image)
      results.push(result)
    }

    return results
  }

  async assessQuality(imageSource: string | Buffer): Promise<DocumentQuality> {
    const result = await this.processImage(imageSource)
    const issues: string[] = []
    const suggestions: string[] = []

    // Check overall confidence
    if (result.confidence < 60) {
      issues.push("Low overall text recognition confidence")
      suggestions.push("Consider rescanning with higher resolution")
    } else if (result.confidence < 80) {
      issues.push("Moderate text recognition confidence")
      suggestions.push("Some fields may require manual verification")
    }

    // Check for common issues
    const lowConfidenceWords = result.words.filter((w) => w.confidence < 50)
    if (lowConfidenceWords.length > result.words.length * 0.2) {
      issues.push("Many words have low confidence")
      suggestions.push("Check document clarity and lighting")
    }

    // Check for skewed or rotated text
    const blocks = result.blocks
    if (blocks.length > 0) {
      const avgBlockHeight = blocks.reduce((sum, b) => sum + (b.bbox.y1 - b.bbox.y0), 0) / blocks.length
      const variance = blocks.reduce((sum, b) => {
        const height = b.bbox.y1 - b.bbox.y0
        return sum + Math.pow(height - avgBlockHeight, 2)
      }, 0) / blocks.length

      if (variance > 1000) {
        issues.push("Document may be skewed or contain mixed orientations")
        suggestions.push("Ensure document is properly aligned during scanning")
      }
    }

    // Calculate quality score
    let score = result.confidence
    score -= issues.length * 10
    score = Math.max(0, Math.min(100, score))

    return { score, issues, suggestions }
  }

  async detectFormType(imageSource: string | Buffer): Promise<{
    type: string
    confidence: number
    indicators: string[]
  }> {
    const result = await this.processImage(imageSource)
    const text = result.text.toUpperCase()

    const formPatterns = [
      {
        type: "cms_1500",
        patterns: ["CMS-1500", "HEALTH INSURANCE CLAIM FORM", "HCFA-1500", "PLACE OF SERVICE"],
        required: 2,
      },
      {
        type: "ub_04",
        patterns: ["UB-04", "UNIFORM BILL", "PATIENT CONTROL NO", "TYPE OF BILL"],
        required: 2,
      },
      {
        type: "prior_auth",
        patterns: ["PRIOR AUTHORIZATION", "PREAUTHORIZATION", "PRE-CERTIFICATION"],
        required: 1,
      },
      {
        type: "operative_notes",
        patterns: ["OPERATIVE REPORT", "OPERATIVE NOTE", "SURGICAL PROCEDURE", "POSTOPERATIVE DIAGNOSIS"],
        required: 2,
      },
      {
        type: "h_and_p",
        patterns: ["HISTORY AND PHYSICAL", "H&P", "CHIEF COMPLAINT", "PHYSICAL EXAMINATION"],
        required: 2,
      },
      {
        type: "referral",
        patterns: ["REFERRAL", "REFERRING PHYSICIAN", "CONSULTATION REQUEST"],
        required: 1,
      },
    ]

    let bestMatch = { type: "other", confidence: 0, indicators: [] as string[] }

    for (const form of formPatterns) {
      const matchedPatterns = form.patterns.filter((p) => text.includes(p))
      if (matchedPatterns.length >= form.required) {
        const confidence = (matchedPatterns.length / form.patterns.length) * 100
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type: form.type,
            confidence,
            indicators: matchedPatterns,
          }
        }
      }
    }

    return bestMatch
  }

  private parseResult(result: RecognizeResult, processingTime: number): OCRResult {
    const words: OCRWord[] = result.data.words.map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: {
        x0: w.bbox.x0,
        y0: w.bbox.y0,
        x1: w.bbox.x1,
        y1: w.bbox.y1,
      },
    }))

    const blocks: OCRBlock[] = result.data.blocks.map((block) => ({
      text: block.text,
      confidence: block.confidence,
      bbox: {
        x0: block.bbox.x0,
        y0: block.bbox.y0,
        x1: block.bbox.x1,
        y1: block.bbox.y1,
      },
      paragraphs: block.paragraphs.map((para) => ({
        text: para.text,
        confidence: para.confidence,
        lines: para.lines.map((line) => ({
          text: line.text,
          confidence: line.confidence,
          words: line.words.map((w) => ({
            text: w.text,
            confidence: w.confidence,
            bbox: {
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1,
            },
          })),
        })),
      })),
    }))

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words,
      blocks,
      processingTime,
    }
  }

  private async ensureWorker(): Promise<void> {
    if (!this.worker) {
      await this.initialize()
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}

// Singleton instance
const globalForTesseract = globalThis as unknown as {
  tesseract: TesseractOCRService | undefined
}

export const tesseract = globalForTesseract.tesseract ?? new TesseractOCRService()

if (process.env.NODE_ENV !== "production") globalForTesseract.tesseract = tesseract

export default tesseract
