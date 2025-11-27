// Mock Redis Client for testing

export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn().mockResolvedValue([]),
  quit: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}

export const mockCache = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
  claimKey: (id: string) => `claim:${id}`,
  claimsListKey: (filters: string) => `claims:list:${filters}`,
  metricsKey: (date: string) => `metrics:${date}`,
  userKey: (id: string) => `user:${id}`,
}

jest.mock("@/lib/db/redis", () => ({
  __esModule: true,
  default: mockRedis,
  redis: mockRedis,
  cache: mockCache,
}))

export default mockRedis
