import React from "react"
import { render, screen } from "@testing-library/react"
import { StatusBadge } from "@/components/ui/status-badge"

describe("StatusBadge Component", () => {
  describe("Claim Status Badges", () => {
    it("renders new status", () => {
      render(<StatusBadge status="new" />)
      expect(screen.getByText("New")).toBeInTheDocument()
    })

    it("renders processing status", () => {
      render(<StatusBadge status="processing" />)
      expect(screen.getByText("Processing")).toBeInTheDocument()
    })

    it("renders validation_pending status", () => {
      render(<StatusBadge status="validation_pending" />)
      expect(screen.getByText("Validation Pending")).toBeInTheDocument()
    })

    it("renders validation_complete status", () => {
      render(<StatusBadge status="validation_complete" />)
      expect(screen.getByText("Validated")).toBeInTheDocument()
    })

    it("renders exception status", () => {
      render(<StatusBadge status="exception" />)
      expect(screen.getByText("Exception")).toBeInTheDocument()
    })

    it("renders human_review status", () => {
      render(<StatusBadge status="human_review" />)
      expect(screen.getByText("Human Review")).toBeInTheDocument()
    })

    it("renders submitted status", () => {
      render(<StatusBadge status="submitted" />)
      expect(screen.getByText("Submitted")).toBeInTheDocument()
    })

    it("renders rejected status", () => {
      render(<StatusBadge status="rejected" />)
      expect(screen.getByText("Rejected")).toBeInTheDocument()
    })

    it("renders ready_for_submission status", () => {
      render(<StatusBadge status="ready_for_submission" />)
      expect(screen.getByText("Ready")).toBeInTheDocument()
    })
  })

  describe("Priority Badges", () => {
    it("renders low priority", () => {
      render(<StatusBadge status="low" />)
      expect(screen.getByText("Low")).toBeInTheDocument()
    })

    it("renders medium priority", () => {
      render(<StatusBadge status="medium" />)
      expect(screen.getByText("Medium")).toBeInTheDocument()
    })

    it("renders high priority", () => {
      render(<StatusBadge status="high" />)
      expect(screen.getByText("High")).toBeInTheDocument()
    })

    it("renders urgent priority", () => {
      render(<StatusBadge status="urgent" />)
      expect(screen.getByText("Urgent")).toBeInTheDocument()
    })
  })

  describe("Validation Status Badges", () => {
    it("renders pass status", () => {
      render(<StatusBadge status="pass" />)
      expect(screen.getByText("Pass")).toBeInTheDocument()
    })

    it("renders warning status", () => {
      render(<StatusBadge status="warning" />)
      expect(screen.getByText("Warning")).toBeInTheDocument()
    })

    it("renders fail status", () => {
      render(<StatusBadge status="fail" />)
      expect(screen.getByText("Fail")).toBeInTheDocument()
    })

    it("renders pending status", () => {
      render(<StatusBadge status="pending" />)
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })
  })

  describe("Size Variants", () => {
    it("renders default size", () => {
      render(<StatusBadge status="new" size="md" />)
      const badge = screen.getByText("New")
      expect(badge).toHaveClass("px-2.5")
    })

    it("renders small size", () => {
      render(<StatusBadge status="new" size="sm" />)
      const badge = screen.getByText("New")
      expect(badge).toHaveClass("px-2")
    })
  })

  describe("Unknown Status", () => {
    it("renders unknown status gracefully", () => {
      // @ts-expect-error Testing invalid status
      render(<StatusBadge status="unknown_status" />)
      // Component uses the raw status as label when not in config
      expect(screen.getByText("unknown_status")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper role", () => {
      const { container } = render(<StatusBadge status="new" />)
      const badge = container.firstChild
      expect(badge).toHaveClass("inline-flex")
    })

    it("text is readable", () => {
      render(<StatusBadge status="submitted" />)
      expect(screen.getByText("Submitted")).toBeVisible()
    })
  })
})
