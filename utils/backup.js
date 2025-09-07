/**
 * @fileoverview Database backup utility
 * @author The Shinra Development Team
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

class BackupManager {
  constructor(client) {
    this.client = client;
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  async ensureBackupDir() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a full database backup
   * @returns {Promise<string>} Backup file path
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
    
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backup = {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        collections: {}
      };

      for (const collection of collections) {
        const collectionName = collection.name;
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backup.collections[collectionName] = data;
      }

      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
      
      // Discord'a backup dosyasını gönder
      await this.sendBackupToDiscord(backupFile, backup);
      
      return backupFile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupFile - Path to backup file
   */
  async restoreBackup(backupFile) {
    try {
      const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));
      
      
      for (const [collectionName, documents] of Object.entries(backupData.collections)) {
        if (documents.length > 0) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          await mongoose.connection.db.collection(collectionName).insertMany(documents);
        }
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          timestamp: file.replace('backup-', '').replace('.json', '')
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        
      return backupFiles;
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean old backups (keep only last N backups)
   * @param {number} keepCount - Number of backups to keep
   */
  async cleanOldBackups(keepCount = 5) {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        for (const backup of toDelete) {
          await fs.unlink(backup.path);
        }
        
      }
    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Send backup file to Discord channel
   * @param {string} backupFile - Path to backup file
   * @param {Object} backupData - Backup data object
   */
  async sendBackupToDiscord(backupFile, backupData) {
    try {
      if (!this.client) return;

      const backupChannel = this.client.channels.cache.get(config.logChannels.backupLog);
      if (!backupChannel) return;

      // Backup dosyasını Discord attachment olarak hazırla
      const attachment = new AttachmentBuilder(backupFile, { 
        name: path.basename(backupFile) 
      });

      // Backup bilgilerini hesapla
      const totalDocuments = Object.values(backupData.collections)
        .reduce((total, docs) => total + docs.length, 0);
      
      const fileSize = (await fs.stat(backupFile)).size;
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

      // Embed oluştur
      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.success} Database Backup Oluşturuldu`)
        .setDescription(`**${path.basename(backupFile)}** dosyası başarıyla oluşturuldu.`)
        .addFields(
          { 
            name: `${config.emojis.info} Backup Bilgileri`, 
            value: `**Tarih:** ${new Date(backupData.timestamp).toLocaleString('tr-TR')}\n**Versiyon:** ${backupData.version}\n**Toplam Doküman:** ${totalDocuments}\n**Dosya Boyutu:** ${fileSizeMB} MB`, 
            inline: true 
          },
          { 
            name: `${config.emojis.stats} Koleksiyonlar`, 
            value: Object.entries(backupData.collections)
              .map(([name, docs]) => `**${name}:** ${docs.length} doküman`)
              .join('\n') || 'Koleksiyon bulunamadı', 
            inline: true 
          }
        )
        .setColor(0x00FF00)
        .setFooter({ text: "The Shinra | Otomatik Backup Sistemi", iconURL: this.client.user?.displayAvatarURL() })
        .setTimestamp();

      // Mesajı gönder
      await backupChannel.send({ 
        embeds: [embed], 
        files: [attachment] 
      });

    } catch (error) {
      // Silent error handling
    }
  }

  /**
   * Schedule automatic backups
   * @param {number} intervalHours - Backup interval in hours
   */
  scheduleBackups(intervalHours = 24) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.createBackup();
        await this.cleanOldBackups(5);
      } catch (error) {
        // Silent error handling
      }
    }, intervalMs);
    
  }
}

module.exports = BackupManager;
