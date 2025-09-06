/**
 * @fileoverview Main entry point for The Shinra Discord Bot
 * @author The Shinra Development Team
 * @version 2.0.0
 */

require("dotenv").config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
const PerformanceMonitor = require("./utils/performanceMonitor");
const BackupManager = require("./utils/backup");

// Environment variables validation
const requiredEnvVars = [
  'BOT_TOKEN',
  'CLIENT_ID', 
  'GUILD_ID',
  'MONGODB_URI',
  'FINDCORD_API'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Eksik environment variables: ${missingVars.join(', ')}`);
  console.error('Lütfen .env dosyanızı kontrol edin ve eksik değişkenleri ekleyin.');
  process.exit(1);
}

console.log("✅ Tüm gerekli environment variables mevcut");

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

if (isProduction) {
  console.log("🚀 Production mode aktif");
} else {
  console.log("🔧 Development mode aktif");
}

// MongoDB bağlantısı - Production optimized
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  bufferCommands: false, // Disable mongoose buffering
  heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
})
  .then(() => console.log("✅ MongoDB bağlantısı başarılı (Production optimized)"))
  .catch(err => console.error("❌ MongoDB bağlantı hatası:", err));

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Bot oluştur
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Initialize performance monitor
client.performanceMonitor = new PerformanceMonitor(client);

// Initialize backup manager
client.backupManager = new BackupManager();

// Schedule automatic backups in production (every 24 hours)
if (isProduction) {
  client.backupManager.scheduleBackups(24);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Discord.js error handlers
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

client.on('warn', warning => {
  console.warn('⚠️ Discord client warning:', warning);
});

// Komutları yükle (alt klasörler dahil)
const commands = [];

/**
 * Recursively loads commands from directories
 * @param {string} dir - Directory path to load commands from
 */
function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = `${dir}/${file.name}`;
    
    if (file.isDirectory()) {
      // Alt klasörse, tekrar içine gir
      loadCommands(filePath);
    } else if (file.name.endsWith(".js")) {
      // .js dosyasıysa, komut olarak yükle
      const command = require(`./${filePath}`);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`✅ Komut yüklendi: ${command.data.name}`);
      } else {
        console.log(`⚠️  Geçersiz komut dosyası: ${filePath}`);
      }
    }
  }
}

loadCommands("./commands");

// Eventleri yükle
const eventFiles = fs.readdirSync("./events").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Logları yükle
const logFiles = fs.readdirSync("./logs").filter(file => file.endsWith(".js"));
for (const file of logFiles) {
  const logs = require(`./logs/${file}`);
  if (logs.once) {
    client.once(logs.name, (...args) => logs.execute(...args, client));
  } else {
    client.on(logs.name, (...args) => logs.execute(...args, client));
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Handles graceful shutdown of the application
 * @param {string} signal - The signal received (SIGTERM, SIGINT, etc.)
 */
async function gracefulShutdown(signal) {
  console.log(`⚠️ Received ${signal}. Graceful shutdown starting...`);
  
  try {
    // Close Discord client
    if (client) {
      await client.destroy();
      console.log('✅ Discord client closed');
    }
    
    // Close MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
    
    // Clear intervals and timeouts
    if (client.sicilCache) {
      client.sicilCache.clear();
      console.log('✅ Cache cleared');
    }
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Environment-specific configurations
if (isDevelopment) {
  // Memory usage monitoring (development only)
  setInterval(() => {
    const used = process.memoryUsage();
    console.log('💾 Memory usage:', {
      rss: Math.round(used.rss / 1024 / 1024 * 100) / 100 + ' MB',
      heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100 + ' MB',
      heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
      external: Math.round(used.external / 1024 / 1024 * 100) / 100 + ' MB'
    });
  }, 300000); // Every 5 minutes

  // Detailed logging in development
  console.log("🔍 Development logging enabled");
} else {
  // Production optimizations
  console.log("⚡ Production optimizations enabled");
  
  // Reduce console output in production
  if (process.env.SILENT_MODE === 'true') {
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
  }
}

client.login(process.env.BOT_TOKEN);
