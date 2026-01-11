// config/redis.js
const redis = require('redis');

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// Connect to Redis
redisClient.connect().catch(err => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});

// Helper functions for session management
const sessionHelpers = {
  // Set user session
  async setUserSession(userId, userData, expiryInSeconds = 604800) { // 7 days default
    try {
      const key = `session:${userId}`;
      await redisClient.setEx(key, expiryInSeconds, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error setting session:', error);
      return false;
    }
  },

  // Get user session
  async getUserSession(userId) {
    try {
      const key = `session:${userId}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  // Delete user session (logout)
  async deleteUserSession(userId) {
    try {
      const key = `session:${userId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  },

  // Cache user data
  async cacheUserData(userId, data, expiryInSeconds = 3600) {
    try {
      const key = `user:${userId}`;
      await redisClient.setEx(key, expiryInSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error caching user data:', error);
      return false;
    }
  },

  // Get cached user data
  async getCachedUserData(userId) {
    try {
      const key = `user:${userId}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  },

  // Invalidate user cache
  async invalidateUserCache(userId) {
    try {
      const key = `user:${userId}`;
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return false;
    }
  },

  // Rate limiting
  async checkRateLimit(identifier, limit = 100, windowInSeconds = 3600) {
    try {
      const key = `ratelimit:${identifier}`;
      const current = await redisClient.incr(key);
      
      if (current === 1) {
        await redisClient.expire(key, windowInSeconds);
      }
      
      return {
        allowed: current <= limit,
        current,
        limit,
        resetTime: windowInSeconds
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: true, current: 0, limit, resetTime: windowInSeconds };
    }
  }
};

module.exports = {
  redisClient,
  sessionHelpers
};