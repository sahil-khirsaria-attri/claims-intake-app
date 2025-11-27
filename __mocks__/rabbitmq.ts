// Mock RabbitMQ for testing

export const QUEUES = {
  OCR_PROCESSING: "ocr_processing",
  AI_EXTRACTION: "ai_extraction",
  VALIDATION: "validation",
  ELIGIBILITY_CHECK: "eligibility_check",
  SUBMISSION: "submission",
  NOTIFICATION: "notification",
}

export const mockRabbitMQ = {
  connect: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue("mock-job-id"),
  consume: jest.fn().mockResolvedValue(undefined),
  cancelConsumer: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  getQueueStatus: jest.fn().mockResolvedValue({ messageCount: 0, consumerCount: 0 }),
}

jest.mock("@/lib/queue/rabbitmq", () => ({
  __esModule: true,
  default: mockRabbitMQ,
  rabbitmq: mockRabbitMQ,
  QUEUES,
}))

export default mockRabbitMQ
