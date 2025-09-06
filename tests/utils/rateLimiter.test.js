/**
 * RateLimiter utility tests
 */

// Mock the RateLimiter class
class MockRateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      findcord: {
        maxRequests: 10,
        windowMs: 1000 // 1 second for testing
      }
    };
  }

  checkLimit(userId, apiType = 'findcord') {
    const limit = this.limits[apiType];
    if (!limit) {
      return { allowed: true, remaining: Infinity, resetTime: 0 };
    }

    const now = Date.now();
    const userKey = `${userId}_${apiType}`;
    const userRequests = this.requests.get(userKey);

    if (!userRequests || now > userRequests.resetTime) {
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
      return {
        allowed: false,
        remaining: 0,
        resetTime: userRequests.resetTime
      };
    }

    userRequests.count++;
    this.requests.set(userKey, userRequests);

    return {
      allowed: true,
      remaining: limit.maxRequests - userRequests.count,
      resetTime: userRequests.resetTime
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new MockRateLimiter();
  });

  describe('checkLimit', () => {
    test('should allow first request', () => {
      const result = rateLimiter.checkLimit('user123', 'findcord');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test('should allow multiple requests within limit', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.checkLimit('user123', 'findcord');
        expect(result.allowed).toBe(true);
      }
      
      const result = rateLimiter.checkLimit('user123', 'findcord');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 6
    });

    test('should block requests after limit exceeded', () => {
      // Make 10 requests to exceed limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkLimit('user123', 'findcord');
      }
      
      const result = rateLimiter.checkLimit('user123', 'findcord');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('should reset after window expires', (done) => {
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkLimit('user123', 'findcord');
      }
      
      // Should be blocked
      let result = rateLimiter.checkLimit('user123', 'findcord');
      expect(result.allowed).toBe(false);
      
      // Wait for window to reset (1 second for test)
      setTimeout(() => {
        result = rateLimiter.checkLimit('user123', 'findcord');
        expect(result.allowed).toBe(true);
        done();
      }, 1100);
    });

    test('should handle different users independently', () => {
      const result1 = rateLimiter.checkLimit('user1', 'findcord');
      const result2 = rateLimiter.checkLimit('user2', 'findcord');
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result1.remaining).toBe(9);
      expect(result2.remaining).toBe(9);
    });

    test('should handle unknown API type', () => {
      const result = rateLimiter.checkLimit('user123', 'unknown');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.resetTime).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('should remove expired entries', () => {
      // Add some entries
      rateLimiter.checkLimit('user1', 'findcord');
      rateLimiter.checkLimit('user2', 'findcord');
      
      // Manually set expired time
      rateLimiter.requests.set('user1_findcord', {
        count: 5,
        resetTime: Date.now() - 1000 // Expired
      });
      
      rateLimiter.cleanup();
      
      expect(rateLimiter.requests.has('user1_findcord')).toBe(false);
      expect(rateLimiter.requests.has('user2_findcord')).toBe(true);
    });
  });
});
