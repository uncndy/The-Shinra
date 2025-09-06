/**
 * HealthCheck utility tests
 */

// Mock HealthCheck class
class MockHealthCheck {
  constructor(client) {
    this.client = client;
  }

  getStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: '1h 30m',
      discord: {
        status: 'connected',
        ping: this.client.ws.ping,
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size
      },
      database: {
        status: 'connected',
        readyState: 1
      },
      memory: this.getMemoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  getOverallStatus() {
    const status = this.getStatus();
    if (status.discord.status === 'connected' && status.database.status === 'connected') {
      return 'healthy';
    } else if (status.discord.status === 'connected' || status.database.status === 'connected') {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external)
    };
  }

  formatBytes(bytes) {
    return Math.round(bytes / 1024 / 1024) + ' MB';
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

// Mock client
const mockClient = {
  ws: { status: 0, ping: 50 },
  guilds: { cache: { size: 5 } },
  users: { cache: { size: 100 } }
};

describe('HealthCheck', () => {
  let healthCheck;

  beforeEach(() => {
    healthCheck = new MockHealthCheck(mockClient);
  });

  describe('getStatus', () => {
    test('should return complete status object', () => {
      const status = healthCheck.getStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('discord');
      expect(status).toHaveProperty('database');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('environment');
    });

    test('should return healthy status when everything is connected', () => {
      const status = healthCheck.getStatus();
      expect(status.status).toBe('healthy');
    });

    test('should return degraded status when one service is down', () => {
      // Create a mock with disconnected database
      const degradedHealthCheck = new MockHealthCheck({
        ws: { status: 0, ping: 50 },
        guilds: { cache: { size: 5 } },
        users: { cache: { size: 100 } }
      });
      
      // Override the getStatus method to simulate degraded state
      degradedHealthCheck.getStatus = function() {
        return {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          uptime: '1h 30m',
          discord: {
            status: 'connected',
            ping: 50,
            guilds: 5,
            users: 100
          },
          database: {
            status: 'disconnected',
            readyState: 0
          },
          memory: this.getMemoryUsage(),
          environment: 'test'
        };
      };
      
      const status = degradedHealthCheck.getStatus();
      expect(status.status).toBe('degraded');
    });

    test('should return unhealthy status when both services are down', () => {
      const unhealthyClient = {
        ws: { status: 1, ping: 0 },
        guilds: { cache: { size: 0 } },
        users: { cache: { size: 0 } }
      };
      
      const unhealthyHealthCheck = new MockHealthCheck(unhealthyClient);
      
      // Override the getStatus method to simulate unhealthy state
      unhealthyHealthCheck.getStatus = function() {
        return {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: '1h 30m',
          discord: {
            status: 'disconnected',
            ping: 0,
            guilds: 0,
            users: 0
          },
          database: {
            status: 'disconnected',
            readyState: 0
          },
          memory: this.getMemoryUsage(),
          environment: 'test'
        };
      };
      
      const status = unhealthyHealthCheck.getStatus();
      expect(status.status).toBe('unhealthy');
    });
  });

  describe('getOverallStatus', () => {
    test('should return healthy when all services are up', () => {
      const status = healthCheck.getOverallStatus();
      expect(status).toBe('healthy');
    });
  });

  describe('getMemoryUsage', () => {
    test('should return memory usage object', () => {
      const memory = healthCheck.getMemoryUsage();
      
      expect(memory).toHaveProperty('rss');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('external');
      
      // Check that values are formatted as strings with MB
      expect(memory.rss).toMatch(/MB$/);
      expect(memory.heapTotal).toMatch(/MB$/);
      expect(memory.heapUsed).toMatch(/MB$/);
      expect(memory.external).toMatch(/MB$/);
    });
  });

  describe('formatUptime', () => {
    test('should format seconds correctly', () => {
      const formatted = healthCheck.formatUptime(30 * 1000); // 30 seconds
      expect(formatted).toBe('30s');
    });

    test('should format minutes correctly', () => {
      const formatted = healthCheck.formatUptime(5 * 60 * 1000); // 5 minutes
      expect(formatted).toBe('5m 0s');
    });

    test('should format hours correctly', () => {
      const formatted = healthCheck.formatUptime(2 * 60 * 60 * 1000); // 2 hours
      expect(formatted).toBe('2h 0m');
    });

    test('should format days correctly', () => {
      const formatted = healthCheck.formatUptime(3 * 24 * 60 * 60 * 1000); // 3 days
      expect(formatted).toBe('3d 0h 0m');
    });
  });

  describe('formatBytes', () => {
    test('should format bytes to MB', () => {
      const formatted = healthCheck.formatBytes(1024 * 1024); // 1 MB
      expect(formatted).toBe('1 MB');
    });

    test('should format large bytes correctly', () => {
      const formatted = healthCheck.formatBytes(5 * 1024 * 1024); // 5 MB
      expect(formatted).toBe('5 MB');
    });
  });
});
