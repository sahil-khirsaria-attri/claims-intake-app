import api, { claimsApi, documentsApi, usersApi, authApi, metricsApi, rulesApi } from "@/lib/api/client"

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Claims API", () => {
    it("should list claims with pagination", async () => {
      const mockResponse = {
        data: [{ id: "claim-1" }, { id: "claim-2" }],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await claimsApi.list({ page: 1, limit: 20 })

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims?page=1&limit=20",
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        })
      )
      expect(result.data).toEqual(mockResponse)
    })

    it("should list claims with filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      await claimsApi.list({ status: "new", priority: "high", search: "test" })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=new"),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("priority=high"),
        expect.any(Object)
      )
    })

    it("should get a single claim", async () => {
      const mockClaim = { id: "claim-1", patientName: "John Doe" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClaim,
      } as Response)

      const result = await claimsApi.get("claim-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1",
        expect.any(Object)
      )
      expect(result.data).toEqual(mockClaim)
    })

    it("should create a claim", async () => {
      const newClaim = { submissionChannel: "portal", patientName: "Jane Doe" }
      const mockResponse = { id: "new-claim", ...newClaim }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const result = await claimsApi.create(newClaim)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newClaim),
        })
      )
      expect(result.data).toEqual(mockResponse)
    })

    it("should update a claim", async () => {
      const updates = { status: "processing" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "claim-1", ...updates }),
      } as Response)

      const result = await claimsApi.update("claim-1", updates)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(updates),
        })
      )
      expect(result.data).toHaveProperty("status", "processing")
    })

    it("should delete a claim", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await claimsApi.delete("claim-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1",
        expect.objectContaining({ method: "DELETE" })
      )
      expect(result.data?.success).toBe(true)
    })

    it("should process a claim", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, jobIds: ["job-1", "job-2"] }),
      } as Response)

      const result = await claimsApi.process("claim-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1/process",
        expect.objectContaining({ method: "POST" })
      )
      expect(result.data?.jobIds).toHaveLength(2)
    })

    it("should validate a claim", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, results: [] }),
      } as Response)

      const result = await claimsApi.validate("claim-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1/validate",
        expect.objectContaining({ method: "POST" })
      )
      expect(result.data?.success).toBe(true)
    })

    it("should submit a claim", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, confirmationNumber: "CLM-123" }),
      } as Response)

      const result = await claimsApi.submit("claim-1", { comment: "Approved" })

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/claims/claim-1/submit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ comment: "Approved" }),
        })
      )
      expect(result.data?.confirmationNumber).toBe("CLM-123")
    })

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Claim not found" }),
      } as Response)

      const result = await claimsApi.get("nonexistent")

      expect(result.error).toBe("Claim not found")
    })

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const result = await claimsApi.list()

      expect(result.error).toBe("Network error")
    })
  })

  describe("Documents API", () => {
    it("should list documents", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "doc-1" }],
      } as Response)

      const result = await documentsApi.list("claim-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents?claimId=claim-1",
        expect.any(Object)
      )
      expect(result.data).toHaveLength(1)
    })

    it("should get a document", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "doc-1", name: "test.pdf" }),
      } as Response)

      const result = await documentsApi.get("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents/doc-1",
        expect.any(Object)
      )
      expect(result.data).toHaveProperty("name", "test.pdf")
    })

    it("should upload a document", async () => {
      const file = new File(["test content"], "test.pdf", { type: "application/pdf" })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-doc" }),
      } as Response)

      const result = await documentsApi.upload("claim-1", file, "cms_1500")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/documents",
        expect.objectContaining({ method: "POST" })
      )
      expect(result.data).toHaveProperty("id", "new-doc")
    })

    it("should delete a document", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await documentsApi.delete("doc-1")

      expect(result.data?.success).toBe(true)
    })

    it("should process OCR", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, fieldsExtracted: 10 }),
      } as Response)

      const result = await documentsApi.processOcr("doc-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ocr/process",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ documentId: "doc-1" }),
        })
      )
    })
  })

  describe("Users API", () => {
    it("should list users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "user-1", name: "Test User" }],
      } as Response)

      const result = await usersApi.list({ role: "admin" })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("role=admin"),
        expect.any(Object)
      )
      expect(result.data).toHaveLength(1)
    })

    it("should get a user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "user-1", email: "test@test.com" }),
      } as Response)

      const result = await usersApi.get("user-1")

      expect(result.data).toHaveProperty("email", "test@test.com")
    })

    it("should create a user", async () => {
      const newUser = { name: "New User", email: "new@test.com", password: "secret" }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-user", ...newUser }),
      } as Response)

      const result = await usersApi.create(newUser)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newUser),
        })
      )
    })

    it("should update a user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "user-1", name: "Updated Name" }),
      } as Response)

      const result = await usersApi.update("user-1", { name: "Updated Name" })

      expect(result.data).toHaveProperty("name", "Updated Name")
    })

    it("should delete a user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await usersApi.delete("user-1")

      expect(result.data?.success).toBe(true)
    })
  })

  describe("Auth API", () => {
    it("should login", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "user-1" }, token: "jwt-token" }),
      } as Response)

      const result = await authApi.login("test@test.com", "password")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "test@test.com", password: "password" }),
        })
      )
      expect(result.data?.token).toBe("jwt-token")
    })

    it("should logout", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await authApi.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" })
      )
      expect(result.data?.success).toBe(true)
    })

    it("should get current user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "user-1", email: "test@test.com" }),
      } as Response)

      const result = await authApi.me()

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/me",
        expect.any(Object)
      )
    })
  })

  describe("Metrics API", () => {
    it("should get metrics", async () => {
      const mockMetrics = {
        totalClaims: 100,
        submitted: 80,
        exceptions: 10,
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      } as Response)

      const result = await metricsApi.get("7d")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/metrics?range=7d",
        expect.any(Object)
      )
      expect(result.data).toEqual(mockMetrics)
    })
  })

  describe("Rules API", () => {
    it("should list rules", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "rule-1", name: "Test Rule" }],
      } as Response)

      const result = await rulesApi.list({ category: "eligibility" })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("category=eligibility"),
        expect.any(Object)
      )
    })

    it("should create a rule", async () => {
      const newRule = {
        name: "New Rule",
        description: "Test description",
        category: "code",
        conditions: [{ field: "Test", operator: "equals", value: "test" }],
        actions: [{ type: "pass" }],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "new-rule", ...newRule }),
      } as Response)

      const result = await rulesApi.create(newRule)

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/validation/rules",
        expect.objectContaining({
          method: "POST",
        })
      )
    })
  })

  describe("Default Export", () => {
    it("should export all APIs", () => {
      expect(api.claims).toBeDefined()
      expect(api.documents).toBeDefined()
      expect(api.users).toBeDefined()
      expect(api.auth).toBeDefined()
      expect(api.metrics).toBeDefined()
      expect(api.rules).toBeDefined()
    })
  })
})
