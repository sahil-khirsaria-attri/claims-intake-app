import { readFile } from "fs/promises"

export interface PDFExtractionResult {
  text: string
  numPages: number
  info: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
}

/**
 * Extract text from a PDF file using pdf-parse
 * Note: pdf-parse works in Node.js but requires special handling
 */
export async function extractTextFromPDF(filePath: string): Promise<PDFExtractionResult> {
  try {
    const dataBuffer = await readFile(filePath)
    return extractTextFromPDFBuffer(Buffer.from(dataBuffer))
  } catch (error) {
    console.error("PDF extraction error:", error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    // Polyfill DOMMatrix for Node.js environment
    if (typeof globalThis.DOMMatrix === "undefined") {
      // @ts-expect-error - polyfill for Node.js
      globalThis.DOMMatrix = class DOMMatrix {
        m11 = 1; m12 = 0; m13 = 0; m14 = 0
        m21 = 0; m22 = 1; m23 = 0; m24 = 0
        m31 = 0; m32 = 0; m33 = 1; m34 = 0
        m41 = 0; m42 = 0; m43 = 0; m44 = 1
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
        is2D = true
        isIdentity = true
        constructor(init?: string | number[]) {
          if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0]; this.b = init[1]; this.c = init[2]
            this.d = init[3]; this.e = init[4]; this.f = init[5]
            this.m11 = init[0]; this.m12 = init[1]
            this.m21 = init[2]; this.m22 = init[3]
            this.m41 = init[4]; this.m42 = init[5]
          }
        }
        static fromMatrix() { return new DOMMatrix() }
        static fromFloat32Array() { return new DOMMatrix() }
        static fromFloat64Array() { return new DOMMatrix() }
        multiply() { return new DOMMatrix() }
        translate() { return new DOMMatrix() }
        scale() { return new DOMMatrix() }
        rotate() { return new DOMMatrix() }
        flipX() { return new DOMMatrix() }
        flipY() { return new DOMMatrix() }
        inverse() { return new DOMMatrix() }
        transformPoint() { return { x: 0, y: 0, z: 0, w: 1 } }
        toFloat32Array() { return new Float32Array(16) }
        toFloat64Array() { return new Float64Array(16) }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)" }
      }
    }

    // Polyfill Path2D for Node.js environment
    if (typeof globalThis.Path2D === "undefined") {
      // @ts-expect-error - polyfill for Node.js
      globalThis.Path2D = class Path2D {
        constructor() {}
        addPath() {}
        closePath() {}
        moveTo() {}
        lineTo() {}
        bezierCurveTo() {}
        quadraticCurveTo() {}
        arc() {}
        arcTo() {}
        ellipse() {}
        rect() {}
      }
    }

    // Polyfill ImageData for Node.js environment
    if (typeof globalThis.ImageData === "undefined") {
      // @ts-expect-error - polyfill for Node.js
      globalThis.ImageData = class ImageData {
        data: Uint8ClampedArray
        width: number
        height: number
        colorSpace = "srgb"
        constructor(width: number, height: number) {
          this.width = width
          this.height = height
          this.data = new Uint8ClampedArray(width * height * 4)
        }
      }
    }

    // Dynamic import of pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse")

    const data = await pdfParse(buffer)

    return {
      text: data.text || "",
      numPages: data.numpages || 0,
      info: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      },
    }
  } catch (error) {
    console.error("PDF extraction error:", error)
    // Return empty result instead of throwing to allow processing to continue
    return {
      text: "",
      numPages: 0,
      info: {},
    }
  }
}

export default { extractTextFromPDF, extractTextFromPDFBuffer }
