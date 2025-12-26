const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    downloadTelegramFile: async function(bot, fileId, botToken) {
        try {
            const file = await bot.getFile(fileId);
            const filePath = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
            
            const response = await axios.get(filePath, { responseType: 'arraybuffer' });
            return Buffer.from(response.data);
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    },
    
    saveTempFile: function(buffer, prefix = 'file') {
        const tempDir = path.join(__dirname, '../assets/temp');
        
        // Create temp directory if not exists
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const filePath = path.join(tempDir, fileName);
        
        fs.writeFileSync(filePath, buffer);
        return filePath;
    },
    
    cleanTempFiles: function(maxAgeMinutes = 60) {
        const tempDir = path.join(__dirname, '../assets/temp');
        
        if (!fs.existsSync(tempDir)) return;
        
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtimeMs > maxAge) {
                try {
                    fs.unlinkSync(filePath);
                } catch (error) {
                    console.error('Failed to delete temp file:', error.message);
                }
            }
        });
    },
    
    getFileInfo: function(filePath) {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    }
};
