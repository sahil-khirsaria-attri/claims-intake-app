// We need to test the actual implementation, so unmock the hooks
jest.unmock("@/lib/hooks/use-claims")

// Mock the API client
jest.mock("@/lib/api/client", () => ({
  claimsApi: {
    list: jest.fn(),
    create: jest.fn(),
  },
  metricsApi: {
    get: jest.fn(),
  },
}))

import { renderHook, waitFor, act } from "@testing-library/react"
import { useClaims, useMetrics, useCreateClaim } from "@/lib/hooks/use-claims"
import { claimsApi, metricsApi } from "@/lib/api/client"

const mockClaimsApi = claimsApi as jest.Mocked<typeof claimsApi>
const mockMetricsApi = metricsApi as jest.Mocked<typeof metricsApi>

describe("useClaims hook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClaimsApi.list.mockResolvedValue({
      data: {
        data: [
          { id: "CLM-001", patientName: "John Doe", status: "new" },
          { id: "CLM-002", patientName: "Jane Smith", status: "processing" },
        ],
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
    })
  })

  it("fetches claims on mount", async () => {
    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockClaimsApi.list).toHaveBeenCalled()
    expect(result.current.claims).toHaveLength(2)
  })

  it("sets loading state correctly", async () => {
    const { result } = renderHook(() => useClaims())

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it("updates pagination", async () => {
    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it("handles API errors", async () => {
    mockClaimsApi.list.mockResolvedValue({ error: "Network error" })

    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe("Network error")
    expect(result.current.claims).toEqual([])
  })

  it("refresh function re-fetches data", async () => {
    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockClaimsApi.list).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockClaimsApi.list).toHaveBeenCalledTimes(2)
  })

  it("setPage updates page and refetches", async () => {
    const { result } = renderHook(() => useClaims())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setPage(2)
    })

    await waitFor(() => {
      expect(result.current.params.page).toBe(2)
    })
  })

  it("uses initial params", async () => {
    const { result } = renderHook(() => useClaims({ page: 2, limit: 20 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockClaimsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 20 })
    )
  })
})

describe("useMetrics hook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMetricsApi.get.mockResolvedValue({
      data: {
        totalClaims: 100,
        newClaims: 10,
        inProgress: 20,
        exceptions: 5,
        humanReview: 3,
        submitted: 62,
        avgProcessingTime: "3.5h",
        exceptionRate: 5.0,
      },
    })
  })

  it("fetches metrics on mount", async () => {
    const { result } = renderHook(() => useMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockMetricsApi.get).toHaveBeenCalled()
    expect(result.current.metrics).not.toBeNull()
  })

  it("returns metrics data", async () => {
    const { result } = renderHook(() => useMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.metrics?.newClaims).toBe(10)
    expect(result.current.metrics?.avgProcessingTime).toBe("3.5h")
  })

  it("handles API errors", async () => {
    mockMetricsApi.get.mockResolvedValue({ error: "Server error" })

    const { result } = renderHook(() => useMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe("Server error")
    expect(result.current.metrics).toBeNull()
  })

  it("refresh function re-fetches data", async () => {
    const { result } = renderHook(() => useMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockMetricsApi.get).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockMetricsApi.get).toHaveBeenCalledTimes(2)
  })

  it("can refresh with specific date range", async () => {
    const { result } = renderHook(() => useMetrics())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.refresh("30d")
    })

    expect(mockMetricsApi.get).toHaveBeenCalledWith("30d")
  })
})

describe("useCreateClaim hook", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockClaimsApi.create.mockResolvedValue({
      data: {
        id: "CLM-NEW",
        patientName: "New Patient",
        memberId: "MBR-NEW",
        status: "new",
      },
    })
  })

  it("creates claim successfully", async () => {
    const { result } = renderHook(() => useCreateClaim())

    let createResult: { success: boolean; data?: unknown; error?: string } | undefined

    await act(async () => {
      createResult = await result.current.createClaim({
        patientName: "New Patient",
        memberId: "MBR-NEW",
        submissionChannel: "portal",
        priority: "medium",
      })
    })

    expect(mockClaimsApi.create).toHaveBeenCalledWith({
      patientName: "New Patient",
      memberId: "MBR-NEW",
      submissionChannel: "portal",
      priority: "medium",
    })

    expect(createResult?.success).toBe(true)
    expect(createResult?.data).toBeDefined()
  })

  it("handles creation error", async () => {
    mockClaimsApi.create.mockResolvedValue({ error: "Validation failed" })

    const { result } = renderHook(() => useCreateClaim())

    let createResult: { success: boolean; data?: unknown; error?: string } | undefined

    await act(async () => {
      createResult = await result.current.createClaim({
        patientName: "Test",
        memberId: "MBR-TEST",
      })
    })

    expect(createResult?.success).toBe(false)
    expect(createResult?.error).toBe("Validation failed")
  })

  it("sets loading state during creation", async () => {
    // Make the API call take some time
    mockClaimsApi.create.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
    )

    const { result } = renderHook(() => useCreateClaim())

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.createClaim({ patientName: "Test" })
    })

    // Should be loading
    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
