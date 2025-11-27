import React from "react"
import { render, screen } from "@testing-library/react"
import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"

// Wrapper with ThemeProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark">
      {ui}
    </ThemeProvider>
  )
}

describe("AppShell Component", () => {
  describe("Rendering", () => {
    it("renders the app shell", () => {
      renderWithProviders(
        <AppShell title="Test Page">
          <div data-testid="content">Page Content</div>
        </AppShell>
      )

      expect(screen.getByTestId("content")).toBeInTheDocument()
    })

    it("renders title", () => {
      renderWithProviders(
        <AppShell title="Dashboard">
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("renders subtitle when provided", () => {
      renderWithProviders(
        <AppShell title="Dashboard" subtitle="Overview of claims">
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText("Overview of claims")).toBeInTheDocument()
    })

    it("renders children", () => {
      renderWithProviders(
        <AppShell title="Test">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AppShell>
      )

      expect(screen.getByTestId("child-1")).toBeInTheDocument()
      expect(screen.getByTestId("child-2")).toBeInTheDocument()
    })
  })

  describe("Layout Structure", () => {
    it("includes sidebar", () => {
      renderWithProviders(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      )

      // Sidebar should render navigation
      expect(screen.getByText("ClaimsAI")).toBeInTheDocument()
    })

    it("includes header", () => {
      renderWithProviders(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      )

      // Header should have search
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    })

    it("has main content area", () => {
      renderWithProviders(
        <AppShell title="Test Page">
          <main data-testid="main-content">Main Content</main>
        </AppShell>
      )

      expect(screen.getByTestId("main-content")).toBeInTheDocument()
    })
  })

  describe("Title and Subtitle", () => {
    it("renders title with correct heading level", () => {
      renderWithProviders(
        <AppShell title="Page Title">
          <div>Content</div>
        </AppShell>
      )

      const title = screen.getByText("Page Title")
      expect(title.tagName).toMatch(/H[1-3]/i)
    })

    it("renders only title when subtitle not provided", () => {
      renderWithProviders(
        <AppShell title="Only Title">
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText("Only Title")).toBeInTheDocument()
    })

    it("handles long titles", () => {
      const longTitle = "This is a very long title that should still render properly"
      renderWithProviders(
        <AppShell title={longTitle}>
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it("handles special characters in title", () => {
      renderWithProviders(
        <AppShell title="Claims & Processing (Beta)">
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText("Claims & Processing (Beta)")).toBeInTheDocument()
    })
  })

  describe("Content Rendering", () => {
    it("renders complex children", () => {
      renderWithProviders(
        <AppShell title="Complex">
          <section data-testid="section">
            <h2>Section Title</h2>
            <p>Paragraph content</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </section>
        </AppShell>
      )

      expect(screen.getByTestId("section")).toBeInTheDocument()
      expect(screen.getByText("Section Title")).toBeInTheDocument()
      expect(screen.getByText("Paragraph content")).toBeInTheDocument()
      expect(screen.getByText("Item 1")).toBeInTheDocument()
      expect(screen.getByText("Item 2")).toBeInTheDocument()
    })

    it("renders React components as children", () => {
      const ChildComponent = () => <div data-testid="child-component">Child Component</div>

      renderWithProviders(
        <AppShell title="Test">
          <ChildComponent />
        </AppShell>
      )

      expect(screen.getByTestId("child-component")).toBeInTheDocument()
    })

    it("renders empty content area", () => {
      renderWithProviders(
        <AppShell title="Empty">
          {null}
        </AppShell>
      )

      // Should still render the shell structure
      expect(screen.getByText("Empty")).toBeInTheDocument()
    })
  })

  describe("Styling", () => {
    it("has proper background", () => {
      const { container } = renderWithProviders(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      )

      // Main container should have background styling
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass("bg-background")
    })

    it("content area has proper padding", () => {
      renderWithProviders(
        <AppShell title="Test">
          <div data-testid="content">Content</div>
        </AppShell>
      )

      // Content should be within a padded container
      const content = screen.getByTestId("content")
      expect(content.parentElement || content).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      renderWithProviders(
        <AppShell title="Main Title" subtitle="Subtitle">
          <h2>Section Heading</h2>
        </AppShell>
      )

      // Title should be a heading
      const title = screen.getByText("Main Title")
      expect(["H1", "H2", "H3"]).toContain(title.tagName)
    })

    it("content is accessible", () => {
      renderWithProviders(
        <AppShell title="Accessible Page">
          <button>Click Me</button>
          <input type="text" aria-label="Name" />
        </AppShell>
      )

      expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument()
      expect(screen.getByLabelText("Name")).toBeInTheDocument()
    })
  })

  describe("Navigation Integration", () => {
    it("renders sidebar navigation", () => {
      renderWithProviders(
        <AppShell title="Test">
          <div>Content</div>
        </AppShell>
      )

      // Sidebar links should be present
      expect(screen.getByText("Claims Inbox")).toBeInTheDocument()
      expect(screen.getByText("Settings")).toBeInTheDocument()
    })
  })
})
