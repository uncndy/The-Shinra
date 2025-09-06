/**
 * Performance Monitor Utility
 * Tracks bot performance metrics
 */

class PerformanceMonitor {
  constructor(client) {
    this.client = client;
    this.metrics = {
      commandsExecuted: 0,
      messagesProcessed: 0,
      errorsOccurred: 0,
      apiCalls: {
        findcord: 0,
        discord: 0
      },
      averageResponseTime: 0,
      responseTimes: []
    };
    
    this.startTime = Date.now();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  setupEventListeners() {
    // Monitor command executions
    this.client.on('interactionCreate', (interaction) => {
      if (interaction.isChatInputCommand()) {
        const startTime = Date.now();
        this.metrics.commandsExecuted++;
        
        // Track response time
        const originalReply = interaction.reply.bind(interaction);
        interaction.reply = async (...args) => {
          const endTime = Date.now();
          this.recordResponseTime(endTime - startTime);
          return originalReply(...args);
        };
      }
    });

    // Monitor message processing
    this.client.on('messageCreate', () => {
      this.metrics.messagesProcessed++;
    });
  }

  /**
   * Record API call
   * @param {string} apiType - Type of API call
   */
  recordApiCall(apiType) {
    if (this.metrics.apiCalls[apiType] !== undefined) {
      this.metrics.apiCalls[apiType]++;
    }
  }

  /**
   * Record error occurrence
   */
  recordError() {
    this.metrics.errorsOccurred++;
  }

  /**
   * Record response time
   * @param {number} responseTime - Response time in milliseconds
   */
  recordResponseTime(responseTime) {
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    // Calculate average
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      ...this.metrics,
      uptime: {
        ms: uptime,
        hours: uptimeHours,
        human: this.formatUptime(uptime)
      },
      rates: {
        commandsPerHour: uptimeHours > 0 ? Math.round(this.metrics.commandsExecuted / uptimeHours) : 0,
        messagesPerHour: uptimeHours > 0 ? Math.round(this.metrics.messagesProcessed / uptimeHours) : 0,
        errorsPerHour: uptimeHours > 0 ? Math.round(this.metrics.errorsOccurred / uptimeHours) : 0
      },
      responseTime: {
        average: Math.round(this.metrics.averageResponseTime),
        min: this.metrics.responseTimes.length > 0 ? Math.min(...this.metrics.responseTimes) : 0,
        max: this.metrics.responseTimes.length > 0 ? Math.max(...this.metrics.responseTimes) : 0
      }
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
   * Reset metrics
   */
  reset() {
    this.metrics = {
      commandsExecuted: 0,
      messagesProcessed: 0,
      errorsOccurred: 0,
      apiCalls: {
        findcord: 0,
        discord: 0
      },
      averageResponseTime: 0,
      responseTimes: []
    };
    this.startTime = Date.now();
  }
}

module.exports = PerformanceMonitor;
