import "@testing-library/jest-dom"

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}))

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: function Image(props) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}))

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: jest.fn(),
    resolvedTheme: "dark",
    themes: ["light", "dark", "system"],
  }),
  ThemeProvider: ({ children }) => children,
}))

// Default mock for auth context - can be overridden in individual tests
const mockLogin = jest.fn().mockResolvedValue({ success: true })
const mockSignup = jest.fn().mockResolvedValue({ success: true })
const mockLogout = jest.fn().mockResolvedValue(undefined)
const mockRefreshUser = jest.fn().mockResolvedValue(undefined)
const mockUser = {
  id: "test-user-id",
  name: "Test User",
  email: "test@claimsai.com",
  role: "admin",
}

jest.mock("@/lib/auth/context", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoading: false,
    isAuthenticated: true,
    login: mockLogin,
    signup: mockSignup,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
  }),
  AuthProvider: ({ children }) => children,
}))

// Export mocks for use in tests
global.mockLogin = mockLogin
global.mockSignup = mockSignup
global.mockLogout = mockLogout
global.mockRefreshUser = mockRefreshUser

// Mock hooks for claims
const mockClaims = []
const mockPagination = { page: 1, limit: 10, total: 0, totalPages: 0 }
const mockMetrics = {
  totalClaims: 0,
  newClaims: 5,
  inProgress: 10,
  exceptions: 3,
  humanReview: 2,
  submitted: 15,
  avgProcessingTime: "2.5h",
  exceptionRate: 5.5,
}
const mockRefreshClaims = jest.fn().mockResolvedValue(undefined)
const mockRefreshMetrics = jest.fn().mockResolvedValue(undefined)
const mockSetPage = jest.fn()
const mockCreateClaim = jest.fn().mockResolvedValue({ success: true, data: {} })

jest.mock("@/lib/hooks/use-claims", () => ({
  useClaims: () => ({
    claims: mockClaims,
    pagination: mockPagination,
    isLoading: false,
    error: null,
    params: { page: 1, limit: 10 },
    refresh: mockRefreshClaims,
    updateParams: jest.fn(),
    setPage: mockSetPage,
  }),
  useMetrics: () => ({
    metrics: mockMetrics,
    isLoading: false,
    error: null,
    refresh: mockRefreshMetrics,
  }),
  useCreateClaim: () => ({
    createClaim: mockCreateClaim,
    isLoading: false,
    error: null,
  }),
}))

// Export hooks mocks
global.mockClaims = mockClaims
global.mockPagination = mockPagination
global.mockMetrics = mockMetrics
global.mockRefreshClaims = mockRefreshClaims
global.mockRefreshMetrics = mockRefreshMetrics
global.mockSetPage = mockSetPage
global.mockCreateClaim = mockCreateClaim

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test"
process.env.REDIS_URL = "redis://localhost:6379"
process.env.RABBITMQ_URL = "amqp://localhost:5672"
process.env.ANTHROPIC_API_KEY = "test-api-key"
process.env.JWT_SECRET = "test-jwt-secret"

// Mock crypto.randomUUID
if (typeof crypto === "undefined") {
  global.crypto = {
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(2),
  }
}

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Warning: An update to") ||
        args[0].includes("act(...)"))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
