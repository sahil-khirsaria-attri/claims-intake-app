import amqp, { Channel, Connection, ConsumeMessage } from "amqplib"

// Queue names
export const QUEUES = {
  OCR_PROCESSING: "ocr_processing",
  AI_EXTRACTION: "ai_extraction",
  VALIDATION: "validation",
  ELIGIBILITY_CHECK: "eligibility_check",
  SUBMISSION: "submission",
  NOTIFICATION: "notification",
} as const

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

// Message types
export interface QueueMessage<T = unknown> {
  id: string
  type: QueueName
  payload: T
  timestamp: string
  attempts: number
  claimId?: string
}

class RabbitMQService {
  private connection: Connection | null = null
  private channel: Channel | null = null
  private isConnecting = false
  private consumers: Map<string, (msg: ConsumeMessage | null) => void> = new Map()

  async connect(): Promise<void> {
    if (this.connection || this.isConnecting) return

    this.isConnecting = true
    const url = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672"

    try {
      this.connection = await amqp.connect(url)
      this.channel = await this.connection.createChannel()

      // Set up queues
      for (const queue of Object.values(QUEUES)) {
        await this.channel.assertQueue(queue, {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": `${queue}_dlq`,
          },
        })
        // Create dead letter queue
        await this.channel.assertQueue(`${queue}_dlq`, { durable: true })
      }

      // Handle connection close
      this.connection.on("close", () => {
        console.log("RabbitMQ connection closed")
        this.connection = null
        this.channel = null
        // Attempt reconnection after delay
        setTimeout(() => this.connect(), 5000)
      })

      this.connection.on("error", (error) => {
        console.error("RabbitMQ connection error:", error)
      })

      console.log("RabbitMQ connected successfully")
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error)
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  async publish<T>(queue: QueueName, message: Omit<QueueMessage<T>, "id" | "timestamp" | "attempts">): Promise<string> {
    await this.ensureConnection()

    const fullMessage: QueueMessage<T> = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      attempts: 0,
    }

    this.channel!.sendToQueue(queue, Buffer.from(JSON.stringify(fullMessage)), {
      persistent: true,
      messageId: fullMessage.id,
    })

    console.log(`Published message ${fullMessage.id} to ${queue}`)
    return fullMessage.id
  }

  async consume<T>(
    queue: QueueName,
    handler: (message: QueueMessage<T>) => Promise<boolean>
  ): Promise<void> {
    await this.ensureConnection()

    const consumer = async (msg: ConsumeMessage | null) => {
      if (!msg) return

      try {
        const message = JSON.parse(msg.content.toString()) as QueueMessage<T>
        message.attempts++

        const success = await handler(message)

        if (success) {
          this.channel!.ack(msg)
        } else if (message.attempts < 3) {
          // Retry with delay
          setTimeout(() => {
            this.channel!.nack(msg, false, true)
          }, Math.pow(2, message.attempts) * 1000)
        } else {
          // Send to dead letter queue
          this.channel!.nack(msg, false, false)
          console.error(`Message ${message.id} exceeded max retries, sent to DLQ`)
        }
      } catch (error) {
        console.error("Error processing message:", error)
        this.channel!.nack(msg, false, false)
      }
    }

    this.consumers.set(queue, consumer)
    await this.channel!.consume(queue, consumer, { noAck: false })
    console.log(`Consumer started for queue: ${queue}`)
  }

  async cancelConsumer(queue: QueueName): Promise<void> {
    this.consumers.delete(queue)
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connection || !this.channel) {
      await this.connect()
    }
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close()
    if (this.connection) await this.connection.close()
    this.channel = null
    this.connection = null
  }

  async getQueueStatus(queue: QueueName): Promise<{ messageCount: number; consumerCount: number }> {
    await this.ensureConnection()
    const info = await this.channel!.checkQueue(queue)
    return {
      messageCount: info.messageCount,
      consumerCount: info.consumerCount,
    }
  }
}

// Singleton instance
const globalForRabbitMQ = globalThis as unknown as {
  rabbitmq: RabbitMQService | undefined
}

export const rabbitmq = globalForRabbitMQ.rabbitmq ?? new RabbitMQService()

if (process.env.NODE_ENV !== "production") globalForRabbitMQ.rabbitmq = rabbitmq

export default rabbitmq
