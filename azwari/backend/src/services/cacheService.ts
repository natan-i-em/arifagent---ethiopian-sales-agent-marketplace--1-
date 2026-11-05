import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// In-Memory Fallback Cache Store
interface MemoryCacheItem {
  value: string;
  expiry: number;
}
const memoryStore = new Map<string, MemoryCacheItem>();

// Background cleaner for memory cache (runs every 60s)
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.expiry > 0 && item.expiry < now) {
      memoryStore.delete(key);
    }
  }
}, 60000).unref();

let redisClient: Redis | null = null;
let isRedisAvailable = false;

const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.warn('[CACHE] Redis max retries exceeded. Falling back to local in-memory cache.');
          isRedisAvailable = false;
          return null; // Stop retrying
        }
        return Math.min(times * 1000, 3000);
      },
    });

    redisClient
      .connect()
      .then(() => {
        isRedisAvailable = true;
        console.log('[CACHE] Connected to Redis cluster successfully.');
      })
      .catch((err: any) => {
        isRedisAvailable = false;
        console.warn('[CACHE] Unable to connect to Redis. Using resilient in-memory cache fallback:', err.message);
      });

    redisClient.on('error', (err: any) => {
      isRedisAvailable = false;
      console.warn('[CACHE ERROR] Redis error encountered (using memory fallback):', err.message);
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
    });
  } catch (err: any) {
    console.warn('[CACHE] Redis initialization notice:', err.message);
    isRedisAvailable = false;
  }
} else {
  console.log('[CACHE] REDIS_URL not configured. Operating in high-performance in-memory cache mode.');
}

/**
 * Enterprise Cache Service
 * Seamlessly interfaces with Redis when available, with automatic in-memory fallback.
 * Completely eliminates redundant database egress to Supabase.
 */
export const cacheService = {
  /**
   * Retrieve cached item by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (isRedisAvailable && redisClient) {
        const val = await redisClient.get(key);
        if (val) return JSON.parse(val) as T;
      }
    } catch (e) {
      // Fallback to memory store if Redis query fails
    }

    const item = memoryStore.get(key);
    if (!item) return null;

    if (item.expiry > 0 && item.expiry < Date.now()) {
      memoryStore.delete(key);
      return null;
    }

    try {
      return JSON.parse(item.value) as T;
    } catch {
      return null;
    }
  },

  /**
   * Store item in cache with TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    const serialized = JSON.stringify(value);

    // Write to memory cache
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    memoryStore.set(key, { value: serialized, expiry });

    // Write to Redis if available
    try {
      if (isRedisAvailable && redisClient) {
        if (ttlSeconds > 0) {
          await redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await redisClient.set(key, serialized);
        }
      }
    } catch (e) {
      // Memory store is already populated
    }
  },

  /**
   * Delete specific cache key
   */
  async del(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      if (isRedisAvailable && redisClient) {
        await redisClient.del(key);
      }
    } catch (e) {}
  },

  /**
   * Invalidate multiple keys matching a pattern (e.g. "products:*", "orders:*")
   */
  async delPattern(pattern: string): Promise<void> {
    // 1. Clear matching keys from memory store
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of memoryStore.keys()) {
      if (regex.test(key)) {
        memoryStore.delete(key);
      }
    }

    // 2. Clear matching keys from Redis
    try {
      if (isRedisAvailable && redisClient) {
        const keys = await redisClient.keys(pattern);
        if (keys && keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
    } catch (e) {}
  },

  /**
   * Flush entire cache
   */
  async flush(): Promise<void> {
    memoryStore.clear();
    try {
      if (isRedisAvailable && redisClient) {
        await redisClient.flushdb();
      }
    } catch (e) {}
  },

  /**
   * Status inspection
   */
  getStatus() {
    return {
      redisAvailable: isRedisAvailable,
      memoryKeysCount: memoryStore.size,
    };
  },
};
