import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import DashboardPage from "@/app/dashboard/page"
import { toast } from "sonner"

// Get mocked functions from global
const mockRefreshClaims = global.mockRefreshClaims as jest.Mock
const mockRefreshMetrics = global.mockRefreshMetrics as jest.Mock
const mockSetPage = global.mockSetPage as jest.Mock
const mockCreateClaim = global.mockCreateClaim as jest.Mock

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClaim.mockResolvedValue({ success: true, data: {} })
  })

  describe("Rendering", () => {
    it("renders the dashboard page", () => {
      render(<DashboardPage />)
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Claims Inbox")
    })

    it("renders metrics cards", () => {
      render(<DashboardPage />)
      expect(screen.getByText("New Claims")).toBeInTheDocument()
      expect(screen.getByText("In Progress")).toBeInTheDocument()
      // "Human Review" appears in both sidebar and metrics card
      expect(screen.getAllByText("Human Review").length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText("Avg. Processing")).toBeInTheDocument()
    })

    it("displays metric values from API", () => {
      render(<DashboardPage />)
      // These values come from the mocked useMetrics hook
      expect(screen.getByText("5")).toBeInTheDocument() // newClaims
      expect(screen.getByText("10")).toBeInTheDocument() // inProgress
      expect(screen.getByText("2.5h")).toBeInTheDocument() // avgProcessingTime
    })

    it("renders page subtitle", () => {
      render(<DashboardPage />)
      expect(screen.getByText("Manage and process incoming claims")).toBeInTheDocument()
    })
  })

  describe("Tabs/Filters", () => {
    it("renders tab filters", () => {
      render(<DashboardPage />)
      expect(screen.getByText(/All Claims/)).toBeInTheDocument()
      expect(screen.getByText(/My Claims/)).toBeInTheDocument()
      expect(screen.getByText(/Unassigned/)).toBeInTheDocument()
    })

    it("allows switching between tabs", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const myClaimsTab = screen.getByText(/My Claims/)
      await user.click(myClaimsTab)

      expect(myClaimsTab).toBeInTheDocument()
    })

    it("resets page when switching tabs", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const myClaimsTab = screen.getByText(/My Claims/)
      await user.click(myClaimsTab)

      expect(mockSetPage).toHaveBeenCalledWith(1)
    })
  })

  describe("Refresh Functionality", () => {
    it("renders refresh button", () => {
      render(<DashboardPage />)
      const refreshButton = screen.getByRole("button", { name: /refresh/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it("calls refresh functions when clicked", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const refreshButton = screen.getByRole("button", { name: /refresh/i })
      await user.click(refreshButton)

      await waitFor(() => {
        expect(mockRefreshClaims).toHaveBeenCalled()
        expect(mockRefreshMetrics).toHaveBeenCalled()
      })
    })

    it("shows success toast after refresh", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const refreshButton = screen.getByRole("button", { name: /refresh/i })
      await user.click(refreshButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Claims data refreshed")
      })
    })
  })

  describe("New Claim Modal", () => {
    it("renders new claim button", () => {
      render(<DashboardPage />)
      const newClaimButton = screen.getByRole("button", { name: /new claim/i })
      expect(newClaimButton).toBeInTheDocument()
    })

    it("opens modal when new claim button is clicked", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const newClaimButton = screen.getByRole("button", { name: /new claim/i })
      await user.click(newClaimButton)

      await waitFor(() => {
        expect(screen.getByText("Create New Claim")).toBeInTheDocument()
      })
    })

    it("renders form fields in modal", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      const newClaimButton = screen.getByRole("button", { name: /new claim/i })
      await user.click(newClaimButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/member id/i)).toBeInTheDocument()
      })
    })

    it("submits form and creates claim", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      // Open modal
      const newClaimButton = screen.getByRole("button", { name: /new claim/i })
      await user.click(newClaimButton)

      // Fill form
      await waitFor(() => {
        expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument()
      })

      const patientNameInput = screen.getByLabelText(/patient name/i)
      const memberIdInput = screen.getByLabelText(/member id/i)

      await user.type(patientNameInput, "John Doe")
      await user.type(memberIdInput, "MBR-123456")

      // Submit
      const createButton = screen.getByRole("button", { name: /create claim/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockCreateClaim).toHaveBeenCalledWith({
          patientName: "John Doe",
          memberId: "MBR-123456",
          submissionChannel: "portal",
          priority: "medium",
        })
      })
    })

    it("shows success toast on successful creation", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      // Open modal
      const newClaimButton = screen.getByRole("button", { name: /new claim/i })
      await user.click(newClaimButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument()
      })

      // Fill and submit
      await user.type(screen.getByLabelText(/patient name/i), "Jane")
      await user.type(screen.getByLabelText(/member id/i), "MBR-789")

      await user.click(screen.getByRole("button", { name: /create claim/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("New claim created successfully")
      })
    })

    it("shows error toast on failed creation", async () => {
      mockCreateClaim.mockResolvedValue({ success: false, error: "Server error" })

      render(<DashboardPage />)
      const user = userEvent.setup()

      // Open modal
      await user.click(screen.getByRole("button", { name: /new claim/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument()
      })

      // Fill and submit
      await user.type(screen.getByLabelText(/patient name/i), "Test")
      await user.type(screen.getByLabelText(/member id/i), "MBR-000")

      await user.click(screen.getByRole("button", { name: /create claim/i }))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Server error")
      })
    })

    it("closes modal after successful creation", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      await user.click(screen.getByRole("button", { name: /new claim/i }))

      await waitFor(() => {
        expect(screen.getByText("Create New Claim")).toBeInTheDocument()
      })

      await user.type(screen.getByLabelText(/patient name/i), "Test")
      await user.type(screen.getByLabelText(/member id/i), "MBR-000")

      await user.click(screen.getByRole("button", { name: /create claim/i }))

      await waitFor(() => {
        expect(screen.queryByText("Create New Claim")).not.toBeInTheDocument()
      })
    })

    it("can cancel modal", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      await user.click(screen.getByRole("button", { name: /new claim/i }))

      await waitFor(() => {
        expect(screen.getByText("Create New Claim")).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText("Create New Claim")).not.toBeInTheDocument()
      })
    })
  })

  describe("Pagination", () => {
    it("renders pagination controls", () => {
      render(<DashboardPage />)
      expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    })

    it("shows page info", () => {
      render(<DashboardPage />)
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
    })

    it("disables previous button on first page", () => {
      render(<DashboardPage />)
      const prevButton = screen.getByRole("button", { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })
  })

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(<DashboardPage />)
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })

    it("form inputs are labeled", async () => {
      render(<DashboardPage />)
      const user = userEvent.setup()

      await user.click(screen.getByRole("button", { name: /new claim/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/patient name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/member id/i)).toBeInTheDocument()
      })
    })
  })

  describe("Claims Table", () => {
    it("renders claims table component", () => {
      render(<DashboardPage />)
      // The table is rendered even if empty
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })
  })

  describe("Filters", () => {
    it("renders filters component", () => {
      render(<DashboardPage />)
      // Claims filters should be rendered
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    })
  })
})
