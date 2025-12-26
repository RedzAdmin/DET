let webcrack;

async function loadWebcrack() {
    if (!webcrack) {
        const webcrackModule = await import('webcrack');
        webcrack = webcrackModule.webcrack;
    }
    return webcrack;
}

module.exports = {
    deobfuscateCode: async (code) => {
        try {
            const crack = await loadWebcrack();
            const result = await crack(code);
            
            return {
                success: true,
                code: result.code,
                length: result.code.length,
                metadata: result.metadata || {}
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    deobfuscateFile: async (fileBuffer) => {
        try {
            const code = fileBuffer.toString('utf-8');
            const crack = await loadWebcrack();
            const result = await crack(code);
            
            const fs = require('fs');
            const path = require('path');
            
            const tempPath = path.join(__dirname, '../assets/temp', `deobfuscated_${Date.now()}.js`);
            fs.writeFileSync(tempPath, result.code);
            
            return {
                success: true,
                filePath: tempPath,
                fileName: `decrypted_by_darkempire.js`,
                length: result.code.length,
                metadata: result.metadata || {}
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};
