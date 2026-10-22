import fs from "fs"
import path from "path"

const dataDir = path.resolve(process.cwd(), "data")
const chancesFilePath = path.join(dataDir, "crashChances.json")

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true })
    } catch {}
  }
}

class LocalRedisClient {
  private memory = new Map<string, string>()

  async get(key: string): Promise<string | null> {
    if (key === "crashChances") {
      try {
        if (fs.existsSync(chancesFilePath)) {
          return fs.readFileSync(chancesFilePath, "utf8")
        }
      } catch {}
    }
    return this.memory.get(key) || null
  }

  async set(key: string, value: string): Promise<"OK"> {
    this.memory.set(key, String(value))
    if (key === "crashChances") {
      try {
        ensureDataDir()
        fs.writeFileSync(chancesFilePath, String(value), "utf8")
      } catch {}
    }
    return "OK"
  }

  async publish(channel: string, message: string): Promise<number> {
    // In local dev without external Redis, log or broadcast
    console.log(`[LocalRedis] publish on ${channel}:`, message)
    return 1
  }
}

// Global instance to persist across Next.js API hot-reloads
const globalForRedis = global as unknown as {
  localRedis?: LocalRedisClient
}

export const redis = globalForRedis.localRedis ?? new LocalRedisClient()

if (process.env.NODE_ENV !== "production") {
  globalForRedis.localRedis = redis
}

export default redis
