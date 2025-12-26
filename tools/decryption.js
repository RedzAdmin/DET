const CryptoJS = require('crypto-js');
const crypto = require('crypto');

module.exports = {
    // AES Decryption
    aesDecrypt: function(encryptedText, password, mode = 'CBC') {
        try {
            let decrypted;
            
            if (mode === 'CBC') {
                // Extract IV from encrypted text (first 16 bytes)
                const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedText);
                const iv = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(0, 4)); // First 16 bytes
                const ciphertext = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(4));
                
                const key = CryptoJS.PBKDF2(password, iv, {
                    keySize: 256/32,
                    iterations: 1000
                });
                
                const decryptedData = CryptoJS.AES.decrypt(
                    { ciphertext: ciphertext },
                    key,
                    { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
                );
                
                decrypted = decryptedData.toString(CryptoJS.enc.Utf8);
            } else {
                // ECB mode (less secure)
                decrypted = CryptoJS.AES.decrypt(encryptedText, password).toString(CryptoJS.enc.Utf8);
            }
            
            if (!decrypted) {
                throw new Error('Decryption failed - wrong password or corrupted data');
            }
            
            return {
                success: true,
                algorithm: `AES-256-${mode}`,
                decrypted: decrypted,
                length: decrypted.length,
                mode: mode
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                algorithm: `AES-256-${mode}`
            };
        }
    },
    
    // DES Decryption
    desDecrypt: function(encryptedText, password) {
        try {
            const key = CryptoJS.enc.Utf8.parse(password.substring(0, 8)); // DES key is 8 bytes
            const decrypted = CryptoJS.DES.decrypt(encryptedText, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }).toString(CryptoJS.enc.Utf8);
            
            return {
                success: true,
                algorithm: 'DES',
                decrypted: decrypted,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Triple DES Decryption
    tripleDesDecrypt: function(encryptedText, password) {
        try {
            const key = CryptoJS.enc.Utf8.parse(password.substring(0, 24)); // 3DES key is 24 bytes
            const decrypted = CryptoJS.TripleDES.decrypt(encryptedText, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }).toString(CryptoJS.enc.Utf8);
            
            return {
                success: true,
                algorithm: '3DES',
                decrypted: decrypted,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Rabbit (stream cipher) Decryption
    rabbitDecrypt: function(encryptedText, password) {
        try {
            const decrypted = CryptoJS.Rabbit.decrypt(encryptedText, password).toString(CryptoJS.enc.Utf8);
            
            return {
                success: true,
                algorithm: 'Rabbit',
                decrypted: decrypted,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // RC4 Decryption
    rc4Decrypt: function(encryptedText, password) {
        try {
            const decrypted = CryptoJS.RC4.decrypt(encryptedText, password).toString(CryptoJS.enc.Utf8);
            
            return {
                success: true,
                algorithm: 'RC4',
                decrypted: decrypted,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // XOR Decryption
    xorDecrypt: function(encryptedText, key) {
        try {
            let decrypted = '';
            for (let i = 0; i < encryptedText.length; i++) {
                const charCode = encryptedText.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }
            
            return {
                success: true,
                algorithm: 'XOR',
                decrypted: decrypted,
                length: decrypted.length,
                key: key
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Base64 Decode (basic)
    base64Decode: function(encodedText) {
        try {
            const decoded = Buffer.from(encodedText, 'base64').toString('utf-8');
            
            return {
                success: true,
                algorithm: 'Base64',
                decoded: decoded,
                length: decoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Hex Decode
    hexDecode: function(hexString) {
        try {
            const decoded = Buffer.from(hexString, 'hex').toString('utf-8');
            
            return {
                success: true,
                algorithm: 'Hex',
                decoded: decoded,
                length: decoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // ROT13/ROT47 Decryption
    rotDecrypt: function(text, type = 'rot13') {
        try {
            let decrypted = '';
            
            if (type === 'rot13') {
                decrypted = text.replace(/[a-zA-Z]/g, function(c) {
                    return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? 
                        c : c - 26);
                });
            } else if (type === 'rot47') {
                decrypted = text.replace(/[!-~]/g, function(c) {
                    return String.fromCharCode(((c.charCodeAt(0) - 33) + 47) % 94 + 33);
                });
            }
            
            return {
                success: true,
                algorithm: type.toUpperCase(),
                decrypted: decrypted,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Caesar Cipher Decryption
    caesarDecrypt: function(text, shift = 3) {
        try {
            let decrypted = '';
            
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                
                if (char.match(/[a-z]/i)) {
                    const code = text.charCodeAt(i);
                    
                    if (code >= 65 && code <= 90) { // Uppercase
                        char = String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
                    } else if (code >= 97 && code <= 122) { // Lowercase
                        char = String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
                    }
                }
                
                decrypted += char;
            }
            
            return {
                success: true,
                algorithm: 'Caesar Cipher',
                decrypted: decrypted,
                shift: shift,
                length: decrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Try multiple decryption methods (brute force for simple ciphers)
    autoDecrypt: function(text, options = {}) {
        const results = [];
        
        // Try Base64
        try {
            const base64 = this.base64Decode(text);
            if (base64.success && base64.decoded.length > 0) {
                results.push(base64);
            }
        } catch (e) {}
        
        // Try Hex
        try {
            const hex = this.hexDecode(text);
            if (hex.success && hex.decoded.length > 0) {
                results.push(hex);
            }
        } catch (e) {}
        
        // Try ROT13
        try {
            const rot13 = this.rotDecrypt(text, 'rot13');
            if (rot13.success && rot13.decrypted !== text) {
                results.push(rot13);
            }
        } catch (e) {}
        
        // Try ROT47
        try {
            const rot47 = this.rotDecrypt(text, 'rot47');
            if (rot47.success && rot47.decrypted !== text) {
                results.push(rot47);
            }
        } catch (e) {}
        
        // Try Caesar with different shifts
        if (options.tryCaesar) {
            for (let shift = 1; shift <= 25; shift++) {
                try {
                    const caesar = this.caesarDecrypt(text, shift);
                    if (caesar.success && caesar.decrypted !== text) {
                        results.push(caesar);
                    }
                } catch (e) {}
            }
        }
        
        return {
            success: results.length > 0,
            attempts: results.length,
            results: results,
            bestGuess: results.length > 0 ? results[0] : null
        };
    },
    
    // File decryption
    decryptFile: function(fileBuffer, algorithm, password) {
        try {
            const encryptedText = fileBuffer.toString('utf-8');
            let result;
            
            switch (algorithm.toLowerCase()) {
                case 'aes':
                case 'aes-256':
                    result = this.aesDecrypt(encryptedText, password);
                    break;
                case 'des':
                    result = this.desDecrypt(encryptedText, password);
                    break;
                case '3des':
                case 'tripledes':
                    result = this.tripleDesDecrypt(encryptedText, password);
                    break;
                case 'xor':
                    result = this.xorDecrypt(encryptedText, password);
                    break;
                case 'base64':
                    result = this.base64Decode(encryptedText);
                    break;
                case 'hex':
                    result = this.hexDecode(encryptedText);
                    break;
                default:
                    throw new Error(`Unsupported algorithm: ${algorithm}`);
            }
            
            if (result.success) {
                const fs = require('fs');
                const path = require('path');
                
                const tempPath = path.join(__dirname, '../assets/temp', `decrypted_${Date.now()}.txt`);
                fs.writeFileSync(tempPath, result.decrypted || result.decoded);
                
                return {
                    success: true,
                    filePath: tempPath,
                    algorithm: algorithm,
                    originalSize: fileBuffer.length,
                    decryptedSize: (result.decrypted || result.decoded).length
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
