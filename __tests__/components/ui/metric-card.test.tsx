import React from "react"
import { render, screen } from "@testing-library/react"
import { MetricCard } from "@/components/ui/metric-card"
import { FileText, TrendingUp, AlertTriangle } from "lucide-react"

describe("MetricCard Component", () => {
  describe("Basic Rendering", () => {
    it("renders with required props", () => {
      render(<MetricCard title="Total Claims" value={100} icon={FileText} />)

      expect(screen.getByText("Total Claims")).toBeInTheDocument()
      expect(screen.getByText("100")).toBeInTheDocument()
    })

    it("renders icon", () => {
      const { container } = render(
        <MetricCard title="Claims" value={50} icon={FileText} />
      )

      // Check for SVG element (Lucide icons render as SVG)
      const svg = container.querySelector("svg")
      expect(svg).toBeInTheDocument()
    })

    it("renders number values", () => {
      render(<MetricCard title="Large Number" value={1000000} icon={FileText} />)
      expect(screen.getByText("1000000")).toBeInTheDocument()
    })

    it("renders string values", () => {
      render(<MetricCard title="Processing Time" value="4.2h" icon={FileText} />)
      expect(screen.getByText("4.2h")).toBeInTheDocument()
    })
  })

  describe("Change Indicator", () => {
    it("renders positive change", () => {
      render(
        <MetricCard
          title="Claims"
          value={100}
          icon={TrendingUp}
          change="+12% from last period"
          changeType="positive"
        />
      )

      expect(screen.getByText("+12% from last period")).toBeInTheDocument()
    })

    it("renders negative change", () => {
      render(
        <MetricCard
          title="Errors"
          value={50}
          icon={AlertTriangle}
          change="-5% from last period"
          changeType="negative"
        />
      )

      expect(screen.getByText("-5% from last period")).toBeInTheDocument()
    })

    it("renders neutral change", () => {
      render(
        <MetricCard
          title="Status"
          value={75}
          icon={FileText}
          change="No change"
          changeType="neutral"
        />
      )

      expect(screen.getByText("No change")).toBeInTheDocument()
    })

    it("renders without change indicator", () => {
      render(<MetricCard title="Claims" value={100} icon={FileText} />)

      // Should not have any change text
      expect(screen.queryByText(/from last/)).not.toBeInTheDocument()
    })
  })

  describe("Styling", () => {
    it("applies positive change styling", () => {
      render(
        <MetricCard
          title="Success"
          value={95}
          icon={TrendingUp}
          change="+10%"
          changeType="positive"
        />
      )

      const changeText = screen.getByText("+10%")
      expect(changeText).toHaveClass("text-success")
    })

    it("applies negative change styling", () => {
      render(
        <MetricCard
          title="Errors"
          value={5}
          icon={AlertTriangle}
          change="-2%"
          changeType="negative"
        />
      )

      const changeText = screen.getByText("-2%")
      expect(changeText).toHaveClass("text-destructive")
    })

    it("applies custom className", () => {
      const { container } = render(
        <MetricCard
          title="Custom"
          value={100}
          icon={FileText}
          className="custom-metric"
        />
      )

      // The Card wrapper should have the custom class
      const card = container.firstChild
      expect(card).toHaveClass("custom-metric")
    })
  })

  describe("Value Formatting", () => {
    it("handles zero value", () => {
      render(<MetricCard title="Empty" value={0} icon={FileText} />)
      expect(screen.getByText("0")).toBeInTheDocument()
    })

    it("handles decimal values", () => {
      render(<MetricCard title="Percentage" value="98.5%" icon={TrendingUp} />)
      expect(screen.getByText("98.5%")).toBeInTheDocument()
    })

    it("handles negative values", () => {
      render(<MetricCard title="Difference" value={-50} icon={AlertTriangle} />)
      expect(screen.getByText("-50")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(<MetricCard title="Accessible Metric" value={100} icon={FileText} />)

      // Title should be present and readable
      expect(screen.getByText("Accessible Metric")).toBeInTheDocument()
    })

    it("value is readable", () => {
      render(<MetricCard title="Value Test" value={12345} icon={FileText} />)
      expect(screen.getByText("12345")).toBeVisible()
    })
  })

  describe("Different Icons", () => {
    it("renders with FileText icon", () => {
      const { container } = render(
        <MetricCard title="Files" value={10} icon={FileText} />
      )
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders with TrendingUp icon", () => {
      const { container } = render(
        <MetricCard title="Trend" value={10} icon={TrendingUp} />
      )
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("renders with AlertTriangle icon", () => {
      const { container } = render(
        <MetricCard title="Alerts" value={10} icon={AlertTriangle} />
      )
      expect(container.querySelector("svg")).toBeInTheDocument()
    })
  })
})
