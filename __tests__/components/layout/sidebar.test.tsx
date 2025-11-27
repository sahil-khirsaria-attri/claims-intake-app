import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Sidebar } from "@/components/layout/sidebar"

// Mock usePathname
const mockPathname = jest.fn().mockReturnValue("/dashboard")
const mockRouterPush = jest.fn()
const mockRouterReplace = jest.fn()

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}))

describe("Sidebar Component", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/dashboard")
    mockRouterPush.mockClear()
    mockRouterReplace.mockClear()
  })

  describe("Rendering", () => {
    it("renders the sidebar", () => {
      render(<Sidebar />)
      // Check for the logo/brand
      expect(screen.getByText("ClaimsAI")).toBeInTheDocument()
    })

    it("renders common navigation links", () => {
      render(<Sidebar />)

      expect(screen.getByText("Claims Inbox")).toBeInTheDocument()
      expect(screen.getByText("Exceptions")).toBeInTheDocument()
      expect(screen.getByText("Human Review")).toBeInTheDocument()
      expect(screen.getByText("Submissions")).toBeInTheDocument()
      expect(screen.getByText("Settings")).toBeInTheDocument()
    })

    it("renders admin links when userRole is admin", () => {
      render(<Sidebar userRole="admin" />)

      expect(screen.getByText("Analytics")).toBeInTheDocument()
      expect(screen.getByText("Users")).toBeInTheDocument()
    })

    it("does not render admin links for non-admin users", () => {
      render(<Sidebar userRole="validation_specialist" />)

      expect(screen.queryByText("Analytics")).not.toBeInTheDocument()
      expect(screen.queryByText("Users")).not.toBeInTheDocument()
    })
  })

  describe("Navigation", () => {
    it("highlights active link", () => {
      mockPathname.mockReturnValue("/dashboard")
      render(<Sidebar />)

      const dashboardLink = screen.getByText("Claims Inbox").closest("a")
      expect(dashboardLink).toHaveClass("bg-sidebar-accent")
    })

    it("does not highlight inactive links", () => {
      mockPathname.mockReturnValue("/dashboard")
      render(<Sidebar />)

      const settingsLink = screen.getByText("Settings").closest("a")
      expect(settingsLink).not.toHaveClass("bg-sidebar-accent")
    })

    it("has correct href attributes", () => {
      render(<Sidebar userRole="admin" />)

      expect(screen.getByText("Claims Inbox").closest("a")).toHaveAttribute("href", "/dashboard")
      expect(screen.getByText("Exceptions").closest("a")).toHaveAttribute("href", "/exceptions")
      expect(screen.getByText("Human Review").closest("a")).toHaveAttribute("href", "/review")
      expect(screen.getByText("Submissions").closest("a")).toHaveAttribute("href", "/submissions")
      expect(screen.getByText("Analytics").closest("a")).toHaveAttribute("href", "/analytics")
      expect(screen.getByText("Users").closest("a")).toHaveAttribute("href", "/users")
      expect(screen.getByText("Settings").closest("a")).toHaveAttribute("href", "/settings")
    })
  })

  describe("Different Active Routes", () => {
    it("highlights exceptions when on /exceptions", () => {
      mockPathname.mockReturnValue("/exceptions")
      render(<Sidebar />)

      const exceptionsLink = screen.getByText("Exceptions").closest("a")
      expect(exceptionsLink).toHaveClass("bg-sidebar-accent")
    })

    it("highlights review when on /review", () => {
      mockPathname.mockReturnValue("/review")
      render(<Sidebar />)

      const reviewLink = screen.getByText("Human Review").closest("a")
      expect(reviewLink).toHaveClass("bg-sidebar-accent")
    })

    it("highlights analytics when on /analytics for admin", () => {
      mockPathname.mockReturnValue("/analytics")
      render(<Sidebar userRole="admin" />)

      const analyticsLink = screen.getByText("Analytics").closest("a")
      expect(analyticsLink).toHaveClass("bg-sidebar-accent")
    })

    it("highlights settings when on /settings", () => {
      mockPathname.mockReturnValue("/settings")
      render(<Sidebar />)

      const settingsLink = screen.getByText("Settings").closest("a")
      expect(settingsLink).toHaveClass("bg-sidebar-accent")
    })
  })

  describe("Styling", () => {
    it("has fixed positioning", () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.querySelector("aside")
      expect(sidebar).toHaveClass("fixed")
    })

    it("has correct width on desktop", () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.querySelector("aside")
      expect(sidebar).toHaveClass("lg:w-64")
    })

    it("has full height", () => {
      const { container } = render(<Sidebar />)
      const sidebar = container.querySelector("aside")
      expect(sidebar).toHaveClass("h-screen")
    })

    it("renders mobile menu button", () => {
      render(<Sidebar />)
      const mobileButton = screen.getByRole("button", { name: /open menu/i })
      expect(mobileButton).toBeInTheDocument()
    })
  })

  describe("Icons", () => {
    it("renders icons for navigation items", () => {
      const { container } = render(<Sidebar />)

      // Each nav item should have an SVG icon
      const svgIcons = container.querySelectorAll("svg")
      expect(svgIcons.length).toBeGreaterThan(0)
    })
  })

  describe("Accessibility", () => {
    it("nav links are accessible", () => {
      render(<Sidebar />)

      const links = screen.getAllByRole("link")
      expect(links.length).toBeGreaterThan(0)

      links.forEach((link) => {
        expect(link).toHaveAttribute("href")
      })
    })

    it("has proper navigation structure", () => {
      const { container } = render(<Sidebar />)
      const nav = container.querySelector("nav")
      expect(nav).toBeInTheDocument()
    })
  })

  describe("Brand Section", () => {
    it("renders brand name", () => {
      render(<Sidebar />)
      expect(screen.getByText("ClaimsAI")).toBeInTheDocument()
    })

    it("renders subtitle", () => {
      render(<Sidebar />)
      expect(screen.getByText("Intelligent Processing")).toBeInTheDocument()
    })
  })

  describe("Badges", () => {
    it("shows badge counts for items with badges", () => {
      render(<Sidebar />)

      // Claims Inbox should have badge count 23
      expect(screen.getByText("23")).toBeInTheDocument()
      // Human Review should have badge count 18
      expect(screen.getByText("18")).toBeInTheDocument()
      // Exceptions should have badge count 34
      expect(screen.getByText("34")).toBeInTheDocument()
    })
  })

  describe("Sign Out", () => {
    it("renders sign out button", () => {
      render(<Sidebar />)
      expect(screen.getByText("Sign Out")).toBeInTheDocument()
    })

    it("sign out button triggers logout and redirects", async () => {
      const user = userEvent.setup()
      render(<Sidebar />)
      const signOutButton = screen.getByText("Sign Out").closest("button")
      expect(signOutButton).toBeInTheDocument()

      await user.click(signOutButton!)

      // Should redirect to login page
      expect(mockRouterReplace).toHaveBeenCalledWith("/login")
    })
  })
})
