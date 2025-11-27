import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Header } from "@/components/layout/header"

describe("Header Component", () => {
  describe("Rendering", () => {
    it("renders the header", () => {
      render(<Header title="Test Page" />)
      expect(screen.getByRole("banner")).toBeInTheDocument()
    })

    it("renders title", () => {
      render(<Header title="Dashboard" />)
      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("renders subtitle when provided", () => {
      render(<Header title="Dashboard" subtitle="Overview" />)
      expect(screen.getByText("Overview")).toBeInTheDocument()
    })

    it("renders search input", () => {
      render(<Header title="Test" />)
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    })

    it("renders notification button", () => {
      render(<Header title="Test" />)
      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })

    it("renders user avatar initials", () => {
      render(<Header title="Test" />)
      // Check for initials (TU from Test User via auth context)
      expect(screen.getByText("TU")).toBeInTheDocument()
    })
  })

  describe("Search Functionality", () => {
    it("search input is interactive", () => {
      render(<Header title="Test" />)
      const searchInput = screen.getByPlaceholderText(/search/i)

      fireEvent.change(searchInput, { target: { value: "test search" } })
      expect(searchInput).toHaveValue("test search")
    })
  })

  describe("Theme Toggle", () => {
    it("renders theme toggle button", () => {
      render(<Header title="Test" />)
      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe("User Menu", () => {
    it("displays user name", () => {
      render(<Header title="Test" />)
      // User name comes from auth context (Test User)
      expect(screen.getByText("Test User")).toBeInTheDocument()
    })

    it("displays user role formatted", () => {
      render(<Header title="Test" />)
      // Role "admin" comes from auth context
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })
  })

  describe("Notifications", () => {
    it("has notification indicator", () => {
      render(<Header title="Test" />)
      const buttons = screen.getAllByRole("button")
      expect(buttons.some(btn => btn.querySelector("svg"))).toBe(true)
    })
  })

  describe("Styling", () => {
    it("has proper header styling", () => {
      render(<Header title="Test" />)
      const header = screen.getByRole("banner")
      expect(header).toHaveClass("border-b")
    })

    it("is sticky positioned", () => {
      render(<Header title="Test" />)
      const header = screen.getByRole("banner")
      expect(header).toHaveClass("sticky")
    })
  })

  describe("Accessibility", () => {
    it("has proper landmark role", () => {
      render(<Header title="Test" />)
      expect(screen.getByRole("banner")).toBeInTheDocument()
    })

    it("search input has accessible placeholder", () => {
      render(<Header title="Test" />)
      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })

    it("buttons are focusable", () => {
      render(<Header title="Test" />)
      const buttons = screen.getAllByRole("button")

      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute("tabindex", "-1")
      })
    })
  })

  describe("Responsive Behavior", () => {
    it("renders on desktop viewport", () => {
      render(<Header title="Test" />)
      expect(screen.getByRole("banner")).toBeVisible()
    })

    it("hides search on mobile screens", () => {
      render(<Header title="Test" />)
      // Search input has lg:block class, hidden by default
      const searchContainer = screen.getByPlaceholderText(/search/i).parentElement
      expect(searchContainer).toHaveClass("hidden")
      expect(searchContainer).toHaveClass("lg:block")
    })

    it("hides help button on mobile screens", () => {
      const { container } = render(<Header title="Test" />)
      // Find the help button by its hidden sm:flex classes
      const helpButton = container.querySelector('button.hidden.sm\\:flex')
      expect(helpButton).toBeInTheDocument()
    })
  })
})
