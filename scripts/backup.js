const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const moment = require('moment');

const backupDir = path.join(__dirname, '../backups');
const dataDir = path.join(__dirname, '../database');
const logsDir = path.join(__dirname, '../logs');

async function createBackup() {
    try {
        // Create backup directory if not exists
        await fs.ensureDir(backupDir);
        
        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
        const backupName = `backup_${timestamp}`;
        const backupPath = path.join(backupDir, backupName);
        
        // Create backup directory
        await fs.ensureDir(backupPath);
        
        // Copy database files
        await fs.copy(dataDir, path.join(backupPath, 'database'));
        
        // Copy logs
        await fs.copy(logsDir, path.join(backupPath, 'logs'));
        
        // Copy config
        await fs.copy(path.join(__dirname, '../config.json'), path.join(backupPath, 'config.json'));
        
        // Create info file
        const info = {
            timestamp: new Date().toISOString(),
            backupName: backupName,
            size: await getFolderSize(backupPath),
            files: await countFiles(backupPath)
        };
        
        await fs.writeJSON(path.join(backupPath, 'info.json'), info, { spaces: 2 });
        
        // Create zip archive
        const zipPath = `${backupPath}.zip`;
        await zipFolder(backupPath, zipPath);
        
        // Remove uncompressed backup
        await fs.remove(backupPath);
        
        console.log(`✅ Backup created: ${zipPath}`);
        console.log(`📦 Size: ${formatBytes(info.size)}`);
        
        // Clean old backups (keep last 10)
        await cleanOldBackups();
        
        return { success: true, path: zipPath, size: info.size };
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function getFolderSize(folder) {
    let size = 0;
    
    async function scan(dir) {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                await scan(itemPath);
            } else {
                size += stats.size;
            }
        }
    }
    
    await scan(folder);
    return size;
}

async function countFiles(folder) {
    let count = 0;
    
    async function scan(dir) {
        const items = await fs.readdir(dir);
        
        for (const item of items) {
            const itemPath = path.join(dir, item);
            const stats = await fs.stat(itemPath);
            
            if (stats.isDirectory()) {
                await scan(itemPath);
            } else {
                count++;
            }
        }
    }
    
    await scan(folder);
    return count;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function zipFolder(source, dest) {
    return new Promise((resolve, reject) => {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        zip.addLocalFolder(source);
        zip.writeZip(dest);
        resolve();
    });
}

async function cleanOldBackups() {
    try {
        const files = await fs.readdir(backupDir);
        const zipFiles = files.filter(f => f.endsWith('.zip'));
        
        if (zipFiles.length > 10) {
            zipFiles.sort();
            const toDelete = zipFiles.slice(0, zipFiles.length - 10);
            
            for (const file of toDelete) {
                await fs.remove(path.join(backupDir, file));
                console.log(`🗑️  Deleted old backup: ${file}`);
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error.message);
    }
}

// Run backup
createBackup().then(result => {
    if (result.success) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});
