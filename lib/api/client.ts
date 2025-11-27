// API Client for frontend-backend communication

const API_BASE = "/api"

interface ApiResponse<T> {
  data?: T
  error?: string
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.error || `HTTP ${response.status}` }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" }
  }
}

// Claims API
export const claimsApi = {
  list: async (params?: {
    page?: number
    limit?: number
    status?: string
    priority?: string
    search?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.limit) searchParams.set("limit", params.limit.toString())
    if (params?.status) searchParams.set("status", params.status)
    if (params?.priority) searchParams.set("priority", params.priority)
    if (params?.search) searchParams.set("search", params.search)

    return fetchApi<PaginatedResponse<unknown>>(`/claims?${searchParams}`)
  },

  get: async (id: string) => {
    return fetchApi<unknown>(`/claims/${id}`)
  },

  create: async (data: {
    submissionChannel?: string
    priority?: string
    patientName?: string
    memberId?: string
  }) => {
    return fetchApi<unknown>("/claims", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return fetchApi<unknown>(`/claims/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/claims/${id}`, {
      method: "DELETE",
    })
  },

  process: async (id: string) => {
    return fetchApi<{ success: boolean; jobIds: string[] }>(`/claims/${id}/process`, {
      method: "POST",
    })
  },

  validate: async (id: string) => {
    return fetchApi<{ success: boolean; results: unknown[] }>(`/claims/${id}/validate`, {
      method: "POST",
    })
  },

  submit: async (id: string, data?: { userId?: string; comment?: string; force?: boolean }) => {
    return fetchApi<{ success: boolean; confirmationNumber: string }>(`/claims/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    })
  },
}

// Documents API
export const documentsApi = {
  list: async (claimId?: string) => {
    const params = claimId ? `?claimId=${claimId}` : ""
    return fetchApi<unknown[]>(`/documents${params}`)
  },

  get: async (id: string) => {
    return fetchApi<unknown>(`/documents/${id}`)
  },

  upload: async (claimId: string, file: File, type?: string) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("claimId", claimId)
    if (type) formData.append("type", type)

    const response = await fetch(`${API_BASE}/documents`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return { error: errorData.error || `HTTP ${response.status}` }
    }

    return { data: await response.json() }
  },

  delete: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/documents/${id}`, {
      method: "DELETE",
    })
  },

  processOcr: async (documentId: string) => {
    return fetchApi<unknown>("/ocr/process", {
      method: "POST",
      body: JSON.stringify({ documentId }),
    })
  },
}

// Users API
export const usersApi = {
  list: async (params?: { role?: string; isActive?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.role) searchParams.set("role", params.role)
    if (params?.isActive !== undefined) searchParams.set("isActive", params.isActive.toString())
    if (params?.search) searchParams.set("search", params.search)

    return fetchApi<unknown[]>(`/users?${searchParams}`)
  },

  get: async (id: string) => {
    return fetchApi<unknown>(`/users/${id}`)
  },

  create: async (data: {
    name: string
    email: string
    password: string
    role?: string
  }) => {
    return fetchApi<unknown>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: Record<string, unknown>) => {
    return fetchApi<unknown>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/users/${id}`, {
      method: "DELETE",
    })
  },
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    return fetchApi<{ user: unknown; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  signup: async (name: string, email: string, password: string, confirmPassword: string) => {
    return fetchApi<{ user: unknown; token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, confirmPassword }),
    })
  },

  logout: async () => {
    return fetchApi<{ success: boolean }>("/auth/logout", {
      method: "POST",
    })
  },

  me: async () => {
    return fetchApi<unknown>("/auth/me")
  },
}

// Metrics API
export const metricsApi = {
  get: async (range?: string) => {
    const params = range ? `?range=${range}` : ""
    return fetchApi<unknown>(`/metrics${params}`)
  },
  getDashboard: async (range?: string) => {
    const params = range ? `?range=${range}` : ""
    return fetchApi<unknown>(`/metrics${params}`)
  },
}

// Fields API
export const fieldsApi = {
  update: async (id: string, value: string) => {
    return fetchApi<unknown>(`/fields/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    })
  },

  delete: async (id: string) => {
    return fetchApi<{ success: boolean }>(`/fields/${id}`, {
      method: "DELETE",
    })
  },

  getSuggestions: async (id: string) => {
    return fetchApi<{
      fieldId: string
      currentValue: string
      suggestedValues: Array<{
        value: string
        confidence: number
        reasoning: string
      }>
      validationHints: string[]
    }>(`/fields/${id}/suggestions`)
  },
}

// AI Analysis API
export const aiApi = {
  getAnalysis: async (claimId: string, type: "exceptions" | "review" | "both" = "both") => {
    return fetchApi<{
      exceptionAnalysis?: {
        summary: string
        rootCauses: Array<{
          issue: string
          explanation: string
          severity: "critical" | "major" | "minor"
        }>
        suggestedFixes: Array<{
          action: string
          description: string
          autoFixable: boolean
          fixValue?: string
        }>
        riskAssessment: {
          denialLikelihood: "high" | "medium" | "low"
          reasoning: string
        }
        recommendedAction: "auto_fix" | "manual_review" | "reject" | "approve_with_warning"
      }
      reviewSummary?: {
        executiveSummary: string
        patientInfo: string
        serviceDetails: string
        financialSummary: string
        validationStatus: string
        riskFactors: string[]
        recommendations: string[]
        priorityLevel: "urgent" | "high" | "normal" | "low"
      }
    }>(`/claims/${claimId}/ai-analysis?type=${type}`)
  },
}

// Validation Rules API
export const rulesApi = {
  list: async (params?: { category?: string; isActive?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set("category", params.category)
    if (params?.isActive !== undefined) searchParams.set("isActive", params.isActive.toString())

    return fetchApi<unknown[]>(`/validation/rules?${searchParams}`)
  },

  create: async (data: {
    name: string
    description: string
    category: string
    conditions: unknown[]
    actions: unknown[]
    priority?: number
  }) => {
    return fetchApi<unknown>("/validation/rules", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}

// Settings API
export const settingsApi = {
  get: async () => {
    return fetchApi<unknown>("/settings")
  },

  update: async (data: {
    notifications?: Record<string, boolean>
    validation?: Record<string, unknown>
  }) => {
    return fetchApi<{ success: boolean }>("/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  updateProfile: async (data: { name?: string; email?: string; department?: string }) => {
    return fetchApi<{ success: boolean; user: unknown }>("/settings/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    return fetchApi<{ success: boolean; message: string }>("/settings/security", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  revokeSessions: async () => {
    return fetchApi<{ success: boolean; message: string }>("/settings/security", {
      method: "POST",
    })
  },

  getIntegrations: async () => {
    return fetchApi<{ integrations: unknown[] }>("/settings/integrations")
  },

  updateIntegration: async (
    integrationId: string,
    action: "connect" | "disconnect" | "test",
    config?: Record<string, string>
  ) => {
    return fetchApi<{ success: boolean; integration: unknown }>("/settings/integrations", {
      method: "PUT",
      body: JSON.stringify({ integrationId, action, config }),
    })
  },
}

export default {
  claims: claimsApi,
  documents: documentsApi,
  users: usersApi,
  auth: authApi,
  metrics: metricsApi,
  fields: fieldsApi,
  rules: rulesApi,
  settings: settingsApi,
  ai: aiApi,
}
