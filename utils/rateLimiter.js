/**
 * API Rate Limiter Utility
 * Prevents abuse of external API calls
 */

class RateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> { count, resetTime }
    this.limits = {
      findcord: {
        maxRequests: 10, // Max 10 requests per user
        windowMs: 60 * 1000, // Per minute
      }
    };
  }

  /**
   * Check if user can make a request to specific API
   * @param {string} userId - Discord user ID
   * @param {string} apiType - API type (e.g., 'findcord')
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(userId, apiType = 'findcord') {
    const limit = this.limits[apiType];
    if (!limit) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const now = Date.now();
    const userKey = `${userId}_${apiType}`;
    const userRequests = this.requests.get(userKey);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or first request
      this.requests.set(userKey, {
        count: 1,
        resetTime: now + limit.windowMs
      });
      return {
        allowed: true,
        remaining: limit.maxRequests - 1,
        resetTime: now + limit.windowMs
      };
    }

    if (userRequests.count >= limit.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: userRequests.resetTime
      };
    }

    // Increment count
    userRequests.count++;
    this.requests.set(userKey, userRequests);

    return {
      allowed: true,
      remaining: limit.maxRequests - userRequests.count,
      resetTime: userRequests.resetTime
    };
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Clean up expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

module.exports = rateLimiter;
