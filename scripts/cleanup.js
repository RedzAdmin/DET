const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');

async function cleanup() {
    console.log('🧹 Starting cleanup...');
    
    const tempDir = path.join(__dirname, '../assets/temp');
    const logsDir = path.join(__dirname, '../logs');
    const maxAgeHours = 24;
    
    let cleaned = 0;
    let errors = 0;
    
    // Clean temp files
    if (await fs.pathExists(tempDir)) {
        const files = await fs.readdir(tempDir);
        const now = Date.now();
        
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            try {
                const stats = await fs.stat(filePath);
                const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
                
                if (ageHours > maxAgeHours) {
                    await fs.remove(filePath);
                    cleaned++;
                    console.log(`🗑️  Deleted: ${file} (${Math.round(ageHours)}h old)`);
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error deleting ${file}:`, error.message);
            }
        }
    }
    
    // Rotate large log files
    if (await fs.pathExists(logsDir)) {
        const files = await fs.readdir(logsDir);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        for (const file of files) {
            if (file.endsWith('.log')) {
                const filePath = path.join(logsDir, file);
                try {
                    const stats = await fs.stat(filePath);
                    
                    if (stats.size > maxSize) {
                        const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
                        const rotatedName = `${file}.${timestamp}.bak`;
                        await fs.move(filePath, path.join(logsDir, rotatedName));
                        await fs.writeFile(filePath, '');
                        console.log(`📦 Rotated: ${file} -> ${rotatedName}`);
                    }
                } catch (error) {
                    errors++;
                    console.error(`❌ Error rotating ${file}:`, error.message);
                }
            }
        }
    }
    
    console.log(`✅ Cleanup completed: ${cleaned} files deleted, ${errors} errors`);
    
    if (errors > 0) {
        process.exit(1);
    }
}

cleanup();
