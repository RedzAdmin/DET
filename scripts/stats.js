const fs = require('fs');
const path = require('path');
const moment = require('moment');

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getStats() {
    const stats = {
        database: {},
        files: {},
        system: {}
    };
    
    try {
        // Database stats
        const dbPath = path.join(__dirname, '../database');
        if (fs.existsSync(dbPath)) {
            const files = fs.readdirSync(dbPath);
            stats.database.files = files.length;
            stats.database.size = 0;
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(dbPath, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    try {
                        const json = JSON.parse(content);
                        if (file === 'users.json') {
                            stats.database.users = Object.keys(json).length;
                        } else if (file === 'premium.json') {
                            stats.database.premium = json.premium_users ? json.premium_users.length : 0;
                        } else if (file === 'stats.json') {
                            stats.database.commands = json.total_commands || 0;
                            stats.database.filesProcessed = json.files_processed || 0;
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                    stats.database.size += fs.statSync(filePath).size;
                }
            }
        }
        
        // File system stats
        const tempDir = path.join(__dirname, '../assets/temp');
        const logsDir = path.join(__dirname, '../logs');
        const backupsDir = path.join(__dirname, '../backups');
        
        stats.files.temp = fs.existsSync(tempDir) ? fs.readdirSync(tempDir).length : 0;
        stats.files.logs = fs.existsSync(logsDir) ? fs.readdirSync(logsDir).length : 0;
        stats.files.backups = fs.existsSync(backupsDir) ? fs.readdirSync(backupsDir).length : 0;
        
        // System stats
        stats.system.uptime = process.uptime();
        stats.system.memory = process.memoryUsage();
        stats.system.nodeVersion = process.version;
        stats.system.platform = process.platform;
        
        return stats;
    } catch (error) {
        console.error('Error getting stats:', error);
        return null;
    }
}

function printStats(stats) {
    console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
    console.log('❒  DARK EMPIRE TECH TOOLS - STATISTICS');
    console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n');
    
    console.log('📊 DATABASE:');
    console.log(`   Users: ${stats.database.users || 0}`);
    console.log(`   Premium: ${stats.database.premium || 0}`);
    console.log(`   Commands: ${stats.database.commands || 0}`);
    console.log(`   Files Processed: ${stats.database.filesProcessed || 0}`);
    console.log(`   Size: ${formatBytes(stats.database.size || 0)}`);
    
    console.log('\n📁 FILES:');
    console.log(`   Temp Files: ${stats.files.temp}`);
    console.log(`   Log Files: ${stats.files.logs}`);
    console.log(`   Backups: ${stats.files.backups}`);
    
    console.log('\n⚙️ SYSTEM:');
    console.log(`   Uptime: ${Math.floor(stats.system.uptime / 3600)}h ${Math.floor((stats.system.uptime % 3600) / 60)}m`);
    console.log(`   Memory: ${formatBytes(stats.system.memory.rss)}`);
    console.log(`   Node: ${stats.system.nodeVersion}`);
    console.log(`   Platform: ${stats.system.platform}`);
    
    console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
    console.log('❒  END OF STATISTICS');
    console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
}

// Run stats
getStats().then(stats => {
    if (stats) {
        printStats(stats);
        process.exit(0);
    } else {
        console.error('Failed to get statistics');
        process.exit(1);
    }
});
