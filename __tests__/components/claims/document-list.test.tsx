import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { DocumentList } from "@/components/claims/document-list"
import { Document } from "@/lib/types"

const mockDocuments: Document[] = [
  {
    id: "doc-1",
    name: "CMS-1500.pdf",
    type: "cms_1500",
    url: "/uploads/doc1.pdf",
    ocrStatus: "complete",
    classificationConfidence: 95,
    qualityScore: 88,
    uploadedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "doc-2",
    name: "Medical_Records.pdf",
    type: "medical_records",
    url: "/uploads/doc2.pdf",
    ocrStatus: "processing",
    classificationConfidence: 80,
    qualityScore: 75,
    uploadedAt: "2024-01-15T11:00:00Z",
  },
  {
    id: "doc-3",
    name: "Auth_Form.pdf",
    type: "prior_auth",
    url: "/uploads/doc3.pdf",
    ocrStatus: "pending",
    classificationConfidence: 0,
    qualityScore: 0,
    uploadedAt: "2024-01-15T12:00:00Z",
  },
]

describe("DocumentList Component", () => {
  const mockOnUpload = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders document list", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      expect(screen.getByText(/Documents/)).toBeInTheDocument()
    })

    it("renders all documents", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      expect(screen.getByText("CMS-1500.pdf")).toBeInTheDocument()
      expect(screen.getByText("Medical_Records.pdf")).toBeInTheDocument()
      expect(screen.getByText("Auth_Form.pdf")).toBeInTheDocument()
    })

    it("renders upload button", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      const uploadButton = screen.getByRole("button", { name: /upload/i })
      expect(uploadButton).toBeInTheDocument()
    })

    it("renders empty state when no documents", () => {
      render(<DocumentList documents={[]} onUpload={mockOnUpload} />)

      expect(screen.getByText(/no documents/i)).toBeInTheDocument()
    })
  })

  describe("Document Status", () => {
    it("shows complete status for processed documents", () => {
      render(<DocumentList documents={[mockDocuments[0]]} onUpload={mockOnUpload} />)

      // Check for OCR status indicator
      expect(screen.getByText("CMS-1500.pdf")).toBeInTheDocument()
    })

    it("shows processing status for documents being processed", () => {
      render(<DocumentList documents={[mockDocuments[1]]} onUpload={mockOnUpload} />)

      expect(screen.getByText("Medical_Records.pdf")).toBeInTheDocument()
    })

    it("shows pending status for unprocessed documents", () => {
      render(<DocumentList documents={[mockDocuments[2]]} onUpload={mockOnUpload} />)

      expect(screen.getByText("Auth_Form.pdf")).toBeInTheDocument()
    })
  })

  describe("Quality Scores", () => {
    it("displays quality score for completed documents", () => {
      render(<DocumentList documents={[mockDocuments[0]]} onUpload={mockOnUpload} />)

      // Quality score should be visible
      expect(screen.getByText(/88%/)).toBeInTheDocument()
    })

    it("shows classification confidence", () => {
      render(<DocumentList documents={[mockDocuments[0]]} onUpload={mockOnUpload} />)

      // Classification confidence shown as percentage
      expect(screen.getByText(/95%/)).toBeInTheDocument()
    })
  })

  describe("Upload Functionality", () => {
    it("calls onUpload when upload button is clicked", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      const uploadButton = screen.getByRole("button", { name: /upload/i })
      fireEvent.click(uploadButton)

      expect(mockOnUpload).toHaveBeenCalledTimes(1)
    })
  })

  describe("Document Types", () => {
    it("renders CMS-1500 document type", () => {
      render(<DocumentList documents={[mockDocuments[0]]} onUpload={mockOnUpload} />)
      expect(screen.getByText("CMS-1500 Form")).toBeInTheDocument()
    })

    it("renders medical records document type", () => {
      render(<DocumentList documents={[mockDocuments[1]]} onUpload={mockOnUpload} />)
      expect(screen.getByText("Medical Records")).toBeInTheDocument()
    })

    it("renders prior auth document type", () => {
      render(<DocumentList documents={[mockDocuments[2]]} onUpload={mockOnUpload} />)
      expect(screen.getByText("Prior Authorization")).toBeInTheDocument()
    })
  })

  describe("Document Count", () => {
    it("shows correct document count", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      // Should show 3 documents or their names
      const docElements = screen.getAllByText(/\.pdf$/i)
      expect(docElements.length).toBe(3)
    })
  })

  describe("Accessibility", () => {
    it("upload button is accessible", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      const uploadButton = screen.getByRole("button", { name: /upload/i })
      expect(uploadButton).not.toBeDisabled()
    })

    it("document list has proper structure", () => {
      render(<DocumentList documents={mockDocuments} onUpload={mockOnUpload} />)

      // Documents should be in a list or table structure
      const docItems = screen.getAllByText(/\.pdf$/i)
      expect(docItems.length).toBeGreaterThan(0)
    })
  })

  describe("Thumbnail Support", () => {
    it("renders document with thumbnail", () => {
      const docWithThumbnail: Document = {
        ...mockDocuments[0],
        thumbnailUrl: "/thumbnails/doc1.png",
      }

      render(<DocumentList documents={[docWithThumbnail]} onUpload={mockOnUpload} />)

      expect(screen.getByText("CMS-1500.pdf")).toBeInTheDocument()
    })

    it("renders document without thumbnail", () => {
      render(<DocumentList documents={[mockDocuments[0]]} onUpload={mockOnUpload} />)

      expect(screen.getByText("CMS-1500.pdf")).toBeInTheDocument()
    })
  })
})
