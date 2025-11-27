// Mock Prisma Client for testing

export const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  claim: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  document: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  extractedField: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  validationCheck: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    createManyAndReturn: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLogEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  payerTracking: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  payerTrackingEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  queueJob: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  businessRule: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  systemConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  processingMetrics: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((callback) => callback(mockPrisma)),
}

jest.mock("@/lib/db/prisma", () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

export default mockPrisma
