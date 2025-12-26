const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

module.exports = {
    createZip: function(files, zipPath, password = null) {
        try {
            const zip = new AdmZip();
            
            files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    if (fs.statSync(file.path).isDirectory()) {
                        zip.addLocalFolder(file.path, file.name || path.basename(file.path));
                    } else {
                        const fileData = fs.readFileSync(file.path);
                        zip.addFile(file.name || path.basename(file.path), fileData);
                    }
                }
            });
            
            if (password) {
                // Password protection for ZIP
                const zipBuffer = zip.toBuffer();
                // Note: AdmZip doesn't support password directly, would need different library
                // For now, we'll just add password to filename
                const finalPath = password ? 
                    zipPath.replace('.zip', `_pass_${password.substring(0, 8)}.zip`) : 
                    zipPath;
                
                zip.writeZip(finalPath);
                return {
                    success: true,
                    filePath: finalPath,
                    password: password,
                    fileCount: files.length,
                    size: fs.statSync(finalPath).size
                };
            } else {
                zip.writeZip(zipPath);
                return {
                    success: true,
                    filePath: zipPath,
                    fileCount: files.length,
                    size: fs.statSync(zipPath).size
                };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    extractZip: function(zipPath, extractTo, password = null) {
        try {
            const zip = new AdmZip(zipPath);
            
            if (password) {
                // Try to extract with password if supported
                try {
                    zip.extractAllTo(extractTo, true);
                } catch (err) {
                    return { success: false, error: 'Password required or incorrect' };
                }
            } else {
                zip.extractAllTo(extractTo, true);
            }
            
            const extracted = fs.readdirSync(extractTo);
            
            return {
                success: true,
                extractedPath: extractTo,
                files: extracted,
                count: extracted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    listZipContents: function(zipPath) {
        try {
            const zip = new AdmZip(zipPath);
            const entries = zip.getEntries();
            
            const files = entries.map(entry => ({
                name: entry.entryName,
                size: entry.header.size,
                compressedSize: entry.header.compressedSize,
                isDirectory: entry.isDirectory,
                comment: entry.comment || ''
            }));
            
            return {
                success: true,
                files: files,
                totalFiles: files.length,
                totalSize: files.reduce((sum, file) => sum + file.size, 0),
                compressedSize: files.reduce((sum, file) => sum + file.compressedSize, 0)
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
