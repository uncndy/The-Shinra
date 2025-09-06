/**
 * @fileoverview Database backup utility
 * @author The Shinra Development Team
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class BackupManager {
  constructor() {
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
        console.log(`✅ Backed up collection: ${collectionName} (${data.length} documents)`);
      }

      await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup created: ${backupFile}`);
      
      return backupFile;
    } catch (error) {
      console.error('❌ Backup failed:', error);
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
      
      console.log(`🔄 Restoring backup from ${backupData.timestamp}`);
      
      for (const [collectionName, documents] of Object.entries(backupData.collections)) {
        if (documents.length > 0) {
          await mongoose.connection.db.collection(collectionName).deleteMany({});
          await mongoose.connection.db.collection(collectionName).insertMany(documents);
          console.log(`✅ Restored collection: ${collectionName} (${documents.length} documents)`);
        }
      }
      
      console.log('✅ Backup restoration completed');
    } catch (error) {
      console.error('❌ Backup restoration failed:', error);
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
      console.error('❌ Failed to list backups:', error);
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
          console.log(`🗑️ Deleted old backup: ${backup.name}`);
        }
        
        console.log(`✅ Cleaned ${toDelete.length} old backups`);
      }
    } catch (error) {
      console.error('❌ Failed to clean old backups:', error);
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
        console.log('🔄 Starting scheduled backup...');
        await this.createBackup();
        await this.cleanOldBackups(5);
        console.log('✅ Scheduled backup completed');
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error);
      }
    }, intervalMs);
    
    console.log(`📅 Scheduled backups every ${intervalHours} hours`);
  }
}

module.exports = BackupManager;
