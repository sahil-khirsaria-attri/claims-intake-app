import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoginPage from "@/app/login/page"
import { toast } from "sonner"

// Mock router
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Get the mocked login function from global
const mockLogin = global.mockLogin as jest.Mock

// Override auth context mock for login tests - user should NOT be authenticated
jest.mock("@/lib/auth/context", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
    logout: jest.fn(),
    refreshUser: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLogin.mockResolvedValue({ success: true })
  })

  describe("Rendering", () => {
    it("renders the login page", () => {
      render(<LoginPage />)

      expect(screen.getByText("ClaimsAI")).toBeInTheDocument()
      expect(screen.getByText("Intelligent Processing")).toBeInTheDocument()
    })

    it("renders email input", () => {
      render(<LoginPage />)

      expect(screen.getByPlaceholderText("name@company.com")).toBeInTheDocument()
    })

    it("renders password input", () => {
      render(<LoginPage />)

      expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument()
    })

    it("renders sign in button", () => {
      render(<LoginPage />)

      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })

    it("renders remember me checkbox", () => {
      render(<LoginPage />)

      expect(screen.getByText(/remember me/i)).toBeInTheDocument()
    })

    it("renders forgot password link", () => {
      render(<LoginPage />)

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it("renders sign in card title", () => {
      render(<LoginPage />)

      // Card title is in a div with data-slot="card-title"
      const signInElements = screen.getAllByText("Sign in")
      expect(signInElements.length).toBeGreaterThanOrEqual(1)
    })

    it("renders card description", () => {
      render(<LoginPage />)

      expect(screen.getByText("Enter your credentials to access your account")).toBeInTheDocument()
    })
  })

  describe("Form Inputs", () => {
    it("allows email input", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      await user.type(emailInput, "test@example.com")

      expect(emailInput).toHaveValue("test@example.com")
    })

    it("allows password input", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const passwordInput = screen.getByPlaceholderText("Enter your password")
      await user.type(passwordInput, "password123")

      expect(passwordInput).toHaveValue("password123")
    })

    it("password input is of type password", () => {
      render(<LoginPage />)

      const passwordInput = screen.getByPlaceholderText("Enter your password")
      expect(passwordInput).toHaveAttribute("type", "password")
    })

    it("email input is of type email", () => {
      render(<LoginPage />)

      const emailInput = screen.getByPlaceholderText("name@company.com")
      expect(emailInput).toHaveAttribute("type", "email")
    })
  })

  describe("Password Visibility Toggle", () => {
    it("can toggle password visibility", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const passwordInput = screen.getByPlaceholderText("Enter your password")
      expect(passwordInput).toHaveAttribute("type", "password")

      // Find and click the toggle button
      const toggleButton = screen.getByRole("button", { name: "" })
      await user.click(toggleButton)

      expect(passwordInput).toHaveAttribute("type", "text")

      // Toggle back
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute("type", "password")
    })
  })

  describe("Form Submission - Success", () => {
    it("submits form with valid credentials", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "sarah.johnson@claimsai.com")
      await user.type(passwordInput, "password123")
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("sarah.johnson@claimsai.com", "password123")
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard")
      })
    })

    it("shows success toast on successful login", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password")
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Login successful")
      })
    })

    it("shows loading state during submission", async () => {
      // Make login take some time
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)))

      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password")
      await user.click(submitButton)

      // Button should indicate loading
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })
  })

  describe("Form Submission - Error", () => {
    it("shows error for invalid credentials", async () => {
      mockLogin.mockResolvedValue({ success: false, error: "Invalid credentials" })

      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "wrong@example.com")
      await user.type(passwordInput, "wrongpassword")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
      })
    })

    it("shows error toast on failed login", async () => {
      mockLogin.mockResolvedValue({ success: false, error: "Account is deactivated" })

      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password")
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Account is deactivated")
      })
    })

    it("does not redirect on failed login", async () => {
      mockLogin.mockResolvedValue({ success: false, error: "Invalid credentials" })

      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "wrong@example.com")
      await user.type(passwordInput, "wrongpassword")
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })

      // Should not redirect
      expect(mockPush).not.toHaveBeenCalled()
    })

    it("shows default error message when no error provided", async () => {
      mockLogin.mockResolvedValue({ success: false })

      render(<LoginPage />)
      const user = userEvent.setup()

      const emailInput = screen.getByPlaceholderText("name@company.com")
      const passwordInput = screen.getByPlaceholderText("Enter your password")
      const submitButton = screen.getByRole("button", { name: /sign in/i })

      await user.type(emailInput, "test@example.com")
      await user.type(passwordInput, "password")
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText("Login failed")).toBeInTheDocument()
      })
    })
  })

  describe("Remember Me", () => {
    it("can toggle remember me checkbox", async () => {
      render(<LoginPage />)
      const user = userEvent.setup()

      const checkbox = screen.getByRole("checkbox")
      expect(checkbox).not.toBeChecked()

      await user.click(checkbox)
      expect(checkbox).toBeChecked()

      await user.click(checkbox)
      expect(checkbox).not.toBeChecked()
    })
  })

  describe("Help/Support Section", () => {
    it("renders help section", () => {
      render(<LoginPage />)

      expect(screen.getByText(/need help/i)).toBeInTheDocument()
    })

    it("shows IT Support link", () => {
      render(<LoginPage />)

      expect(screen.getByText("IT Support")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("form is accessible", () => {
      render(<LoginPage />)

      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
    })

    it("inputs have proper labels", () => {
      render(<LoginPage />)

      expect(screen.getByLabelText("Email")).toBeInTheDocument()
      expect(screen.getByLabelText("Password")).toBeInTheDocument()
    })

    it("has proper heading structure", () => {
      render(<LoginPage />)

      expect(screen.getByText("ClaimsAI")).toBeInTheDocument()
    })

    it("email input is required", () => {
      render(<LoginPage />)

      const emailInput = screen.getByPlaceholderText("name@company.com")
      expect(emailInput).toBeRequired()
    })

    it("password input is required", () => {
      render(<LoginPage />)

      const passwordInput = screen.getByPlaceholderText("Enter your password")
      expect(passwordInput).toBeRequired()
    })
  })

  describe("Styling", () => {
    it("renders with proper styling", () => {
      const { container } = render(<LoginPage />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it("renders logo with AI text", () => {
      render(<LoginPage />)

      expect(screen.getByText("AI")).toBeInTheDocument()
    })
  })

  describe("Navigation Links", () => {
    it("has forgot password link", () => {
      render(<LoginPage />)

      const forgotLink = screen.getByText(/forgot password/i)
      expect(forgotLink).toBeInTheDocument()
      expect(forgotLink.tagName).toBe("A")
    })

    it("IT Support is a link", () => {
      render(<LoginPage />)

      const supportLink = screen.getByText("IT Support")
      expect(supportLink.tagName).toBe("A")
    })
  })
})
