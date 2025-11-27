import Redis from "ioredis"

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
  redisAvailable: boolean
}

// Track if Redis is available
let redisAvailable = globalForRedis.redisAvailable ?? true

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      // Only retry once, then give up quickly
      if (times > 1) {
        redisAvailable = false
        return null // Stop retrying
      }
      return 100 // Retry after 100ms
    },
    connectTimeout: 1000, // 1 second timeout for connection
    commandTimeout: 1000, // 1 second timeout for commands
    lazyConnect: true,
    enableOfflineQueue: false, // Don't queue commands when disconnected
  })

  redis.on("error", (error) => {
    redisAvailable = false
    console.warn("Redis unavailable:", error.message)
  })

  redis.on("connect", () => {
    redisAvailable = true
    console.log("Redis connected successfully")
  })

  redis.on("close", () => {
    redisAvailable = false
  })

  return redis
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis
  globalForRedis.redisAvailable = redisAvailable
}

// Check if Redis is available
export const isRedisAvailable = () => redisAvailable

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    // Skip if Redis is not available
    if (!redisAvailable) {
      return null
    }
    try {
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      redisAvailable = false
      console.warn("Redis get error, disabling cache:", (error as Error).message)
      return null
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    // Skip if Redis is not available
    if (!redisAvailable) {
      return
    }
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      redisAvailable = false
      console.warn("Redis set error, disabling cache:", (error as Error).message)
    }
  },

  async del(key: string): Promise<void> {
    // Skip if Redis is not available
    if (!redisAvailable) {
      return
    }
    try {
      await redis.del(key)
    } catch (error) {
      redisAvailable = false
      console.warn("Redis del error, disabling cache:", (error as Error).message)
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    // Skip if Redis is not available
    if (!redisAvailable) {
      return
    }
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      redisAvailable = false
      console.warn("Redis invalidate pattern error, disabling cache:", (error as Error).message)
    }
  },

  // Claim-specific cache keys
  claimKey: (id: string) => `claim:${id}`,
  claimsListKey: (filters: string) => `claims:list:${filters}`,
  metricsKey: (date: string) => `metrics:${date}`,
  userKey: (id: string) => `user:${id}`,
}

export default redis
