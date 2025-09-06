/**
 * Health Check Utility
 * Provides health status of the bot
 */

const mongoose = require('mongoose');

class HealthCheck {
  constructor(client) {
    this.client = client;
    this.startTime = Date.now();
  }

  /**
   * Get comprehensive health status
   * @returns {Object} Health status object
   */
  getStatus() {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    return {
      status: this.getOverallStatus(),
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        human: this.formatUptime(uptime)
      },
      discord: {
        status: this.client.ws.status === 0 ? 'connected' : 'disconnected',
        ping: this.client.ws.ping,
        guilds: this.client.guilds.cache.size,
        users: this.client.users.cache.size
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
      },
      memory: this.getMemoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get overall health status
   * @returns {string} 'healthy', 'degraded', or 'unhealthy'
   */
  getOverallStatus() {
    const discordOk = this.client.ws.status === 0;
    const dbOk = mongoose.connection.readyState === 1;
    
    if (discordOk && dbOk) return 'healthy';
    if (discordOk || dbOk) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Get memory usage information
   * @returns {Object} Memory usage object
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: this.formatBytes(usage.rss),
      heapTotal: this.formatBytes(usage.heapTotal),
      heapUsed: this.formatBytes(usage.heapUsed),
      external: this.formatBytes(usage.external)
    };
  }

  /**
   * Format uptime in human readable format
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted uptime
   */
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

  /**
   * Format bytes in human readable format
   * @param {number} bytes - Bytes
   * @returns {string} Formatted bytes
   */
  formatBytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 100) / 100} MB`;
  }
}

module.exports = HealthCheck;
