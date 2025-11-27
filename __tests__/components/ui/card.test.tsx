import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

describe("Card Components", () => {
  describe("Card", () => {
    it("renders correctly", () => {
      render(<Card data-testid="card">Card Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toBeInTheDocument()
      expect(card).toHaveTextContent("Card Content")
    })

    it("applies custom className", () => {
      render(<Card className="custom-class" data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("custom-class")
    })

    it("has default styling classes", () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId("card")
      expect(card).toHaveClass("rounded-xl")
      expect(card).toHaveClass("border")
    })

    it("renders children", () => {
      render(
        <Card>
          <div data-testid="child">Child Element</div>
        </Card>
      )
      expect(screen.getByTestId("child")).toBeInTheDocument()
    })
  })

  describe("CardHeader", () => {
    it("renders correctly", () => {
      render(<CardHeader data-testid="header">Header Content</CardHeader>)
      const header = screen.getByTestId("header")
      expect(header).toBeInTheDocument()
    })

    it("applies padding classes", () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      const header = screen.getByTestId("header")
      expect(header).toHaveClass("px-6")
    })

    it("applies custom className", () => {
      render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>)
      expect(screen.getByTestId("header")).toHaveClass("custom-header")
    })
  })

  describe("CardTitle", () => {
    it("renders correctly", () => {
      render(<CardTitle>Card Title</CardTitle>)
      expect(screen.getByText("Card Title")).toBeInTheDocument()
    })

    it("has correct typography classes", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId("title")
      expect(title).toHaveClass("font-semibold")
      expect(title).toHaveClass("leading-none")
    })

    it("applies custom className", () => {
      render(<CardTitle className="custom-title" data-testid="title">Title</CardTitle>)
      expect(screen.getByTestId("title")).toHaveClass("custom-title")
    })
  })

  describe("CardDescription", () => {
    it("renders correctly", () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText("Description text")).toBeInTheDocument()
    })

    it("has muted text color", () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>)
      const desc = screen.getByTestId("desc")
      expect(desc).toHaveClass("text-muted-foreground")
    })

    it("applies custom className", () => {
      render(<CardDescription className="custom-desc" data-testid="desc">Desc</CardDescription>)
      expect(screen.getByTestId("desc")).toHaveClass("custom-desc")
    })
  })

  describe("CardContent", () => {
    it("renders correctly", () => {
      render(<CardContent data-testid="content">Main content</CardContent>)
      expect(screen.getByTestId("content")).toBeInTheDocument()
    })

    it("has correct padding", () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("px-6")
    })

    it("applies custom className", () => {
      render(<CardContent className="custom-content" data-testid="content">Content</CardContent>)
      expect(screen.getByTestId("content")).toHaveClass("custom-content")
    })
  })

  describe("CardFooter", () => {
    it("renders correctly", () => {
      render(<CardFooter data-testid="footer">Footer content</CardFooter>)
      expect(screen.getByTestId("footer")).toBeInTheDocument()
    })

    it("has flex layout", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId("footer")
      expect(footer).toHaveClass("flex")
    })

    it("applies custom className", () => {
      render(<CardFooter className="custom-footer" data-testid="footer">Footer</CardFooter>)
      expect(screen.getByTestId("footer")).toHaveClass("custom-footer")
    })
  })

  describe("Complete Card", () => {
    it("renders a complete card structure", () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content goes here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByTestId("complete-card")).toBeInTheDocument()
      expect(screen.getByText("Test Card")).toBeInTheDocument()
      expect(screen.getByText("This is a test card")).toBeInTheDocument()
      expect(screen.getByText("Main content goes here")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /action/i })).toBeInTheDocument()
    })
  })
})
