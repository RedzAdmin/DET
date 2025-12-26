const CryptoJS = require('crypto-js');
const crypto = require('crypto');

module.exports = {
    // AES Encryption
    aesEncrypt: function(text, password, mode = 'CBC') {
        try {
            let encrypted;
            
            if (mode === 'CBC') {
                // Generate random IV
                const iv = CryptoJS.lib.WordArray.random(16);
                
                // Derive key from password using PBKDF2
                const key = CryptoJS.PBKDF2(password, iv, {
                    keySize: 256/32,
                    iterations: 1000
                });
                
                // Encrypt
                const encryptedData = CryptoJS.AES.encrypt(text, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });
                
                // Combine IV and ciphertext
                const combined = CryptoJS.lib.WordArray.create()
                    .concat(iv)
                    .concat(encryptedData.ciphertext);
                
                encrypted = combined.toString(CryptoJS.enc.Base64);
            } else {
                // ECB mode (less secure)
                encrypted = CryptoJS.AES.encrypt(text, password).toString();
            }
            
            return {
                success: true,
                algorithm: `AES-256-${mode}`,
                encrypted: encrypted,
                length: encrypted.length,
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
    
    // DES Encryption
    desEncrypt: function(text, password) {
        try {
            const key = CryptoJS.enc.Utf8.parse(password.substring(0, 8)); // DES key is 8 bytes
            const encrypted = CryptoJS.DES.encrypt(text, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }).toString();
            
            return {
                success: true,
                algorithm: 'DES',
                encrypted: encrypted,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Triple DES Encryption
    tripleDesEncrypt: function(text, password) {
        try {
            const key = CryptoJS.enc.Utf8.parse(password.substring(0, 24)); // 3DES key is 24 bytes
            const encrypted = CryptoJS.TripleDES.encrypt(text, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }).toString();
            
            return {
                success: true,
                algorithm: '3DES',
                encrypted: encrypted,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Rabbit (stream cipher) Encryption
    rabbitEncrypt: function(text, password) {
        try {
            const encrypted = CryptoJS.Rabbit.encrypt(text, password).toString();
            
            return {
                success: true,
                algorithm: 'Rabbit',
                encrypted: encrypted,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // RC4 Encryption
    rc4Encrypt: function(text, password) {
        try {
            const encrypted = CryptoJS.RC4.encrypt(text, password).toString();
            
            return {
                success: true,
                algorithm: 'RC4',
                encrypted: encrypted,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // XOR Encryption
    xorEncrypt: function(text, key) {
        try {
            let encrypted = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                encrypted += String.fromCharCode(charCode);
            }
            
            return {
                success: true,
                algorithm: 'XOR',
                encrypted: encrypted,
                length: encrypted.length,
                key: key
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Base64 Encode
    base64Encode: function(text) {
        try {
            const encoded = Buffer.from(text).toString('base64');
            
            return {
                success: true,
                algorithm: 'Base64',
                encoded: encoded,
                length: encoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Hex Encode
    hexEncode: function(text) {
        try {
            const encoded = Buffer.from(text).toString('hex');
            
            return {
                success: true,
                algorithm: 'Hex',
                encoded: encoded,
                length: encoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // ROT13/ROT47 Encryption
    rotEncrypt: function(text, type = 'rot13') {
        try {
            let encrypted = '';
            
            if (type === 'rot13') {
                encrypted = text.replace(/[a-zA-Z]/g, function(c) {
                    return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? 
                        c : c - 26);
                });
            } else if (type === 'rot47') {
                encrypted = text.replace(/[!-~]/g, function(c) {
                    return String.fromCharCode(((c.charCodeAt(0) - 33) + 47) % 94 + 33);
                });
            }
            
            return {
                success: true,
                algorithm: type.toUpperCase(),
                encrypted: encrypted,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Caesar Cipher Encryption
    caesarEncrypt: function(text, shift = 3) {
        try {
            let encrypted = '';
            
            for (let i = 0; i < text.length; i++) {
                let char = text[i];
                
                if (char.match(/[a-z]/i)) {
                    const code = text.charCodeAt(i);
                    
                    if (code >= 65 && code <= 90) { // Uppercase
                        char = String.fromCharCode(((code - 65 + shift) % 26) + 65);
                    } else if (code >= 97 && code <= 122) { // Lowercase
                        char = String.fromCharCode(((code - 97 + shift) % 26) + 97);
                    }
                }
                
                encrypted += char;
            }
            
            return {
                success: true,
                algorithm: 'Caesar Cipher',
                encrypted: encrypted,
                shift: shift,
                length: encrypted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // Generate random password
    generatePassword: function(length = 16, options = {}) {
        try {
            const {
                uppercase = true,
                lowercase = true,
                numbers = true,
                symbols = true
            } = options;
            
            let charset = '';
            if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
            if (numbers) charset += '0123456789';
            if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            if (charset === '') {
                throw new Error('At least one character type must be selected');
            }
            
            let password = '';
            const crypto = require('crypto');
            
            for (let i = 0; i < length; i++) {
                const randomIndex = crypto.randomInt(0, charset.length);
                password += charset[randomIndex];
            }
            
            // Calculate entropy
            const entropy = Math.log2(Math.pow(charset.length, length));
            
            // Check password strength
            let strength = 'Weak';
            if (entropy > 80) strength = 'Strong';
            else if (entropy > 60) strength = 'Good';
            else if (entropy > 40) strength = 'Fair';
            
            return {
                success: true,
                password: password,
                length: length,
                entropy: entropy.toFixed(2),
                strength: strength,
                charsetSize: charset.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    // File encryption
    encryptFile: function(fileBuffer, algorithm, password) {
        try {
            const text = fileBuffer.toString('utf-8');
            let result;
            
            switch (algorithm.toLowerCase()) {
                case 'aes':
                case 'aes-256':
                    result = this.aesEncrypt(text, password);
                    break;
                case 'des':
                    result = this.desEncrypt(text, password);
                    break;
                case '3des':
                case 'tripledes':
                    result = this.tripleDesEncrypt(text, password);
                    break;
                case 'xor':
                    result = this.xorEncrypt(text, password);
                    break;
                case 'base64':
                    result = this.base64Encode(text);
                    break;
                case 'hex':
                    result = this.hexEncode(text);
                    break;
                default:
                    throw new Error(`Unsupported algorithm: ${algorithm}`);
            }
            
            if (result.success) {
                const fs = require('fs');
                const path = require('path');
                
                const tempPath = path.join(__dirname, '../assets/temp', `encrypted_${Date.now()}.txt`);
                fs.writeFileSync(tempPath, result.encrypted || result.encoded);
                
                return {
                    success: true,
                    filePath: tempPath,
                    algorithm: algorithm,
                    originalSize: fileBuffer.length,
                    encryptedSize: (result.encrypted || result.encoded).length
                };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
