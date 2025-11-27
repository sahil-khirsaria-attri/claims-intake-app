import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button, buttonVariants } from "@/components/ui/button"

describe("Button Component", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole("button", { name: /click me/i })
      expect(button).toBeInTheDocument()
    })

    it("renders children correctly", () => {
      render(<Button>Test Button Text</Button>)
      expect(screen.getByText("Test Button Text")).toBeInTheDocument()
    })

    it("renders as a child component when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole("link", { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/test")
    })
  })

  describe("Variants", () => {
    it("renders default variant", () => {
      render(<Button variant="default">Default</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-primary")
    })

    it("renders destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-destructive")
    })

    it("renders outline variant", () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("border")
    })

    it("renders secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-secondary")
    })

    it("renders ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("hover:bg-accent")
    })

    it("renders link variant", () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("text-primary")
    })
  })

  describe("Sizes", () => {
    it("renders default size", () => {
      render(<Button size="default">Default Size</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-9")
    })

    it("renders small size", () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-8")
    })

    it("renders large size", () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("h-10")
    })

    it("renders icon size", () => {
      render(<Button size="icon">Icon</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("size-9")
    })
  })

  describe("Interactions", () => {
    it("handles click events", () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Click</Button>)

      fireEvent.click(screen.getByRole("button"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("is disabled when disabled prop is true", () => {
      const handleClick = jest.fn()
      render(<Button disabled onClick={handleClick}>Disabled</Button>)

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()

      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe("Accessibility", () => {
    it("has correct role", () => {
      render(<Button>Accessible</Button>)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("can have aria-label", () => {
      render(<Button aria-label="Close dialog">X</Button>)
      expect(screen.getByLabelText("Close dialog")).toBeInTheDocument()
    })

    it("can have aria-disabled", () => {
      render(<Button aria-disabled="true">Aria Disabled</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
  })

  describe("Custom Classes", () => {
    it("accepts custom className", () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
    })

    it("merges custom className with variant classes", () => {
      render(<Button variant="destructive" className="custom-class">Merged</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("bg-destructive")
      expect(button).toHaveClass("custom-class")
    })
  })

  describe("buttonVariants helper", () => {
    it("returns correct classes for default variant", () => {
      const classes = buttonVariants({ variant: "default" })
      expect(classes).toContain("bg-primary")
    })

    it("returns correct classes for size", () => {
      const classes = buttonVariants({ size: "sm" })
      expect(classes).toContain("h-8")
    })

    it("combines variant and size correctly", () => {
      const classes = buttonVariants({ variant: "destructive", size: "lg" })
      expect(classes).toContain("bg-destructive")
      expect(classes).toContain("h-10")
    })
  })

  describe("Forwarded Props", () => {
    it("forwards type prop", () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "submit")
    })

    it("forwards id prop", () => {
      render(<Button id="test-button">Test</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("id", "test-button")
    })

    it("forwards data attributes", () => {
      render(<Button data-testid="custom-button">Test</Button>)
      expect(screen.getByTestId("custom-button")).toBeInTheDocument()
    })
  })
})
