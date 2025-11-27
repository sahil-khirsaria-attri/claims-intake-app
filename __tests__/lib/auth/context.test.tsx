import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// We need to test the actual implementation, so we'll unmock and import fresh
jest.unmock("@/lib/auth/context")

// Mock the API client
jest.mock("@/lib/api/client", () => ({
  authApi: {
    login: jest.fn(),
    signup: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
  },
}))

import { AuthProvider, useAuth } from "@/lib/auth/context"
import { authApi } from "@/lib/api/client"

const mockAuthApi = authApi as jest.Mocked<typeof authApi>

// Test component that uses the auth hook
function TestComponent() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
      <div data-testid="authenticated">{isAuthenticated ? "authenticated" : "not-authenticated"}</div>
      <div data-testid="user">{user ? user.name : "no-user"}</div>
      <button onClick={() => login("test@example.com", "password")}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default to no user logged in
    mockAuthApi.me.mockResolvedValue({ data: null })
    mockAuthApi.login.mockResolvedValue({ data: { user: { id: "1", name: "Test User", email: "test@example.com", role: "admin" }, token: "test-token" } })
    mockAuthApi.signup.mockResolvedValue({ data: { user: { id: "2", name: "New User", email: "new@example.com", role: "intake_clerk" }, token: "test-token" } })
    mockAuthApi.logout.mockResolvedValue({ data: { success: true } })
  })

  describe("AuthProvider", () => {
    it("renders children", async () => {
      render(
        <AuthProvider>
          <div>Test Child</div>
        </AuthProvider>
      )

      expect(screen.getByText("Test Child")).toBeInTheDocument()
    })

    it("starts with loading state", async () => {
      mockAuthApi.me.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId("loading")).toHaveTextContent("loading")
    })

    it("finishes loading after checking auth", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })
    })

    it("shows not authenticated when no user", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("not-authenticated")
      })
    })

    it("shows authenticated when user exists", async () => {
      mockAuthApi.me.mockResolvedValue({
        data: { id: "1", name: "Test User", email: "test@example.com", role: "admin" },
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("authenticated")
      })
    })

    it("displays user name when logged in", async () => {
      mockAuthApi.me.mockResolvedValue({
        data: { id: "1", name: "Test User", email: "test@example.com", role: "admin" },
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("Test User")
      })
    })
  })

  describe("login", () => {
    it("calls authApi.login with correct credentials", async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Login"))

      expect(mockAuthApi.login).toHaveBeenCalledWith("test@example.com", "password")
    })

    it("updates user state on successful login", async () => {
      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Login"))

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("Test User")
      })
    })

    it("returns success on successful login", async () => {
      const user = userEvent.setup()
      let loginResult: { success: boolean; error?: string } | undefined

      function TestLoginResult() {
        const { login, isLoading } = useAuth()

        const handleLogin = async () => {
          loginResult = await login("test@example.com", "password")
        }

        return (
          <div>
            <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
            <button onClick={handleLogin}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestLoginResult />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Login"))

      await waitFor(() => {
        expect(loginResult).toEqual({ success: true })
      })
    })

    it("returns error on failed login", async () => {
      mockAuthApi.login.mockResolvedValue({ error: "Invalid credentials" })
      const user = userEvent.setup()
      let loginResult: { success: boolean; error?: string } | undefined

      function TestLoginResult() {
        const { login, isLoading } = useAuth()

        const handleLogin = async () => {
          loginResult = await login("test@example.com", "wrong")
        }

        return (
          <div>
            <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
            <button onClick={handleLogin}>Login</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestLoginResult />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Login"))

      await waitFor(() => {
        expect(loginResult).toEqual({ success: false, error: "Invalid credentials" })
      })
    })
  })

  describe("signup", () => {
    it("calls authApi.signup with correct data", async () => {
      const user = userEvent.setup()
      let signupResult: { success: boolean; error?: string } | undefined

      function TestSignup() {
        const { signup, isLoading } = useAuth()

        const handleSignup = async () => {
          signupResult = await signup("New User", "new@example.com", "password123", "password123")
        }

        return (
          <div>
            <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
            <button onClick={handleSignup}>Signup</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestSignup />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Signup"))

      expect(mockAuthApi.signup).toHaveBeenCalledWith("New User", "new@example.com", "password123", "password123")
    })

    it("returns success on successful signup", async () => {
      const user = userEvent.setup()
      let signupResult: { success: boolean; error?: string } | undefined

      function TestSignup() {
        const { signup, isLoading } = useAuth()

        const handleSignup = async () => {
          signupResult = await signup("New User", "new@example.com", "password123", "password123")
        }

        return (
          <div>
            <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
            <button onClick={handleSignup}>Signup</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestSignup />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Signup"))

      await waitFor(() => {
        expect(signupResult).toEqual({ success: true })
      })
    })

    it("returns error on failed signup", async () => {
      mockAuthApi.signup.mockResolvedValue({ error: "Email already exists" })
      const user = userEvent.setup()
      let signupResult: { success: boolean; error?: string } | undefined

      function TestSignup() {
        const { signup, isLoading } = useAuth()

        const handleSignup = async () => {
          signupResult = await signup("New User", "existing@example.com", "password123", "password123")
        }

        return (
          <div>
            <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
            <button onClick={handleSignup}>Signup</button>
          </div>
        )
      }

      render(
        <AuthProvider>
          <TestSignup />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded")
      })

      await user.click(screen.getByText("Signup"))

      await waitFor(() => {
        expect(signupResult).toEqual({ success: false, error: "Email already exists" })
      })
    })
  })

  describe("logout", () => {
    it("calls authApi.logout", async () => {
      mockAuthApi.me.mockResolvedValue({
        data: { id: "1", name: "Test User", email: "test@example.com", role: "admin" },
      })

      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent("authenticated")
      })

      await user.click(screen.getByText("Logout"))

      expect(mockAuthApi.logout).toHaveBeenCalled()
    })

    it("clears user state on logout", async () => {
      mockAuthApi.me.mockResolvedValue({
        data: { id: "1", name: "Test User", email: "test@example.com", role: "admin" },
      })

      const user = userEvent.setup()

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("Test User")
      })

      await user.click(screen.getByText("Logout"))

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("no-user")
      })
    })
  })

  describe("useAuth hook", () => {
    it("throws error when used outside AuthProvider", () => {
      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})

      expect(() => {
        render(<TestComponent />)
      }).toThrow("useAuth must be used within an AuthProvider")

      consoleSpy.mockRestore()
    })
  })
})
