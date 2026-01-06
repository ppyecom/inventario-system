import { Redis } from 'ioredis';

let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ Redis connection failed, running without cache');
          return null;
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  } else {
    console.warn('⚠️ REDIS_URL not set, running without cache');
  }
} catch (error) {
  console.error('❌ Redis initialization failed:', error);
  redis = null;
}

export { redis };

// Helper para caché con TTL
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutos por defecto
): Promise<T> {
  // Si Redis no está disponible, ejecutar fetcher directamente
  if (!redis) {
    return fetcher();
  }

  try {
    // Intentar obtener del caché
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Si no está en caché, obtener datos
    const data = await fetcher();

    // Guardar en caché
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Redis cache error:', error);
    // Si Redis falla, ejecutar el fetcher directamente
    return fetcher();
  }
}

// Helper para invalidar caché
export async function invalidateCache(pattern: string) {
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}