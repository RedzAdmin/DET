const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

module.exports = {
    generateQR: async function(text, options = {}) {
        try {
            const tempPath = path.join(__dirname, '../assets/temp', `qr_${Date.now()}.png`);
            
            await QRCode.toFile(tempPath, text, {
                width: options.width || 300,
                margin: options.margin || 1,
                color: {
                    dark: options.darkColor || '#000000',
                    light: options.lightColor || '#FFFFFF'
                }
            });
            
            return {
                success: true,
                filePath: tempPath,
                text: text
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
