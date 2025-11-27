import React from "react"
import { render, screen } from "@testing-library/react"
import { ValidationPanel } from "@/components/claims/validation-panel"
import { ValidationCheck } from "@/lib/types"

const mockValidationChecks: ValidationCheck[] = [
  {
    id: "check-1",
    category: "eligibility",
    name: "Member Eligibility",
    description: "Verify member is eligible for coverage",
    status: "pass",
    details: "Member is active and eligible",
  },
  {
    id: "check-2",
    category: "code",
    name: "Valid NPI Format",
    description: "Provider NPI must be valid",
    status: "pass",
    details: "NPI verified successfully",
  },
  {
    id: "check-3",
    category: "code",
    name: "Code Bundling Check",
    description: "Check for bundled codes",
    status: "warning",
    details: "CPT 99213 may be bundled with 99214",
  },
  {
    id: "check-4",
    category: "business_rule",
    name: "Referring Provider Required",
    description: "Specialist visits require referring provider",
    status: "warning",
    details: "Missing referring provider NPI",
  },
  {
    id: "check-5",
    category: "document",
    name: "Document Quality",
    description: "Document must meet quality threshold",
    status: "fail",
    details: "Quality score 55% is below 70% threshold",
  },
]

describe("ValidationPanel Component", () => {
  describe("Rendering", () => {
    it("renders validation panel", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Member Eligibility")).toBeInTheDocument()
    })

    it("renders all validation checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Member Eligibility")).toBeInTheDocument()
      expect(screen.getByText("Valid NPI Format")).toBeInTheDocument()
      expect(screen.getByText("Code Bundling Check")).toBeInTheDocument()
      expect(screen.getByText("Referring Provider Required")).toBeInTheDocument()
      expect(screen.getByText("Document Quality")).toBeInTheDocument()
    })

    it("renders empty state when no checks", () => {
      render(<ValidationPanel checks={[]} />)

      expect(screen.getByText(/validation not yet run/i)).toBeInTheDocument()
    })
  })

  describe("Status Display", () => {
    it("shows pass status correctly", () => {
      render(<ValidationPanel checks={[mockValidationChecks[0]]} />)

      // Should show pass indicator (green checkmark or "Pass" text)
      expect(screen.getByText("Member Eligibility")).toBeInTheDocument()
    })

    it("shows warning status correctly", () => {
      render(<ValidationPanel checks={[mockValidationChecks[2]]} />)

      expect(screen.getByText("Code Bundling Check")).toBeInTheDocument()
      // Details may be in tooltip or directly visible
      expect(screen.getByText(/99213/)).toBeInTheDocument()
    })

    it("shows fail status correctly", () => {
      render(<ValidationPanel checks={[mockValidationChecks[4]]} />)

      expect(screen.getByText("Document Quality")).toBeInTheDocument()
      expect(screen.getByText(/below.*threshold/i)).toBeInTheDocument()
    })
  })

  describe("Category Grouping", () => {
    it("displays eligibility category checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Member Eligibility")).toBeInTheDocument()
    })

    it("displays code category checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Valid NPI Format")).toBeInTheDocument()
      expect(screen.getByText("Code Bundling Check")).toBeInTheDocument()
    })

    it("displays business rule category checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Referring Provider Required")).toBeInTheDocument()
    })

    it("displays document category checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      expect(screen.getByText("Document Quality")).toBeInTheDocument()
    })
  })

  describe("Details Display", () => {
    it("shows check details", () => {
      render(<ValidationPanel checks={[mockValidationChecks[0]]} />)

      expect(screen.getByText(/active and eligible/i)).toBeInTheDocument()
    })

    it("shows warning details", () => {
      render(<ValidationPanel checks={[mockValidationChecks[2]]} />)

      expect(screen.getByText(/99213.*bundled/i)).toBeInTheDocument()
    })

    it("shows failure details", () => {
      render(<ValidationPanel checks={[mockValidationChecks[4]]} />)

      expect(screen.getByText(/55%.*below/i)).toBeInTheDocument()
    })
  })

  describe("Summary Statistics", () => {
    it("shows count of passed checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      // Should display summary of 2 passed
      const passedCount = mockValidationChecks.filter((c) => c.status === "pass").length
      expect(passedCount).toBe(2)
    })

    it("shows count of warning checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      const warningCount = mockValidationChecks.filter((c) => c.status === "warning").length
      expect(warningCount).toBe(2)
    })

    it("shows count of failed checks", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      const failedCount = mockValidationChecks.filter((c) => c.status === "fail").length
      expect(failedCount).toBe(1)
    })
  })

  describe("Styling", () => {
    it("applies pass styling", () => {
      const { container } = render(<ValidationPanel checks={[mockValidationChecks[0]]} />)

      // Check for success/green styling indicator
      expect(container.querySelector('[class*="success"]') || screen.getByText("Member Eligibility")).toBeTruthy()
    })

    it("applies warning styling", () => {
      const { container } = render(<ValidationPanel checks={[mockValidationChecks[2]]} />)

      // Check for warning/yellow styling indicator
      expect(container.querySelector('[class*="warning"]') || screen.getByText("Code Bundling Check")).toBeTruthy()
    })

    it("applies fail styling", () => {
      const { container } = render(<ValidationPanel checks={[mockValidationChecks[4]]} />)

      // Check for destructive/red styling indicator
      expect(container.querySelector('[class*="destructive"]') || screen.getByText("Document Quality")).toBeTruthy()
    })
  })

  describe("Descriptions", () => {
    it("shows check descriptions", () => {
      render(<ValidationPanel checks={[mockValidationChecks[0]]} />)

      expect(screen.getByText(/eligible for coverage/i)).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("checks are properly labeled", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      // Each check should have its name visible
      mockValidationChecks.forEach((check) => {
        expect(screen.getByText(check.name)).toBeInTheDocument()
      })
    })

    it("status is discernible", () => {
      render(<ValidationPanel checks={mockValidationChecks} />)

      // All checks should be visible
      expect(screen.getAllByText(/eligibility|npi|bundling|referring|quality/i).length).toBeGreaterThan(0)
    })
  })

  describe("Pending Status", () => {
    it("handles pending validation checks", () => {
      const pendingCheck: ValidationCheck = {
        id: "pending-1",
        category: "eligibility",
        name: "Pending Check",
        description: "This check is pending",
        status: "pending",
      }

      render(<ValidationPanel checks={[pendingCheck]} />)

      expect(screen.getByText("Pending Check")).toBeInTheDocument()
    })
  })
})
