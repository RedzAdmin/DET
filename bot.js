const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load configuration
const config = require('./config.json');
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Load modules
const adminModule = require('./modules/admin');
const verificationModule = require('./modules/user_verification');
const menuModule = require('./modules/menu');
const fileHandler = require('./modules/file_handler');
const logger = require('./modules/logger');
const broadcastModule = require('./modules/broadcast');
const premiumModule = require('./modules/premium');

// Load tools
const obfuscator = require('./tools/obfuscator');
const deobfuscator = require('./tools/deobfuscator');
const encryption = require('./tools/encryption');
const decryption = require('./tools/decryption');
const hashTools = require('./tools/hash_tools');
const zipTools = require('./tools/zip_tools');
const urlShortener = require('./tools/url_shortener');
const qrGenerator = require('./tools/qr_generator');
const scanner = require('./tools/scanner');
const networkTools = require('./tools/network_tools');
const converter = require('./tools/converter');

// Database
const db = {
    users: require('./database/users.json'),
    premium: require('./database/premium.json'),
    settings: require('./database/settings.json'),
    banned: require('./database/banned.json'),
    stats: require('./database/stats.json'),
    
    save: function(file) {
        const files = {
            'users': './database/users.json',
            'premium': './database/premium.json',
            'settings': './database/settings.json',
            'banned': './database/banned.json',
            'stats': './database/stats.json'
        };
        
        if (files[file]) {
            fs.writeFileSync(files[file], JSON.stringify(this[file], null, 2));
        }
    }
};

// Initialize empty databases
function initializeDB() {
    if (Object.keys(db.users).length === 0) {
        db.users = {};
        db.save('users');
    }
    
    if (!db.premium.premium_users) {
        db.premium = { premium_users: [], subscriptions: {} };
        db.save('premium');
    }
    
    if (!db.settings.maintenance) {
        db.settings = {
            maintenance: false,
            maintenance_message: "Bot is under maintenance. Please try again later.",
            required_channels: [config.CHANNEL],
            required_groups: [config.GROUP],
            welcome_message: "Welcome to Dark Empire Tech Tools"
        };
        db.save('settings');
    }
    
    if (!db.stats.total_users) {
        db.stats = {
            total_users: 0,
            total_commands: 0,
            files_processed: 0,
            total_premium: 0,
            total_banned: 0,
            start_time: new Date().toISOString()
        };
        db.save('stats');
    }
}

// Utility functions
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isPremium(userId) {
    return db.users[userId] && db.users[userId].is_premium === true;
}

function isAdmin(userId) {
    return adminModule.isAdmin(userId, config);
}

// ==================== STARTUP ====================
console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
console.log('❒  BOTNAME : DARK EMPIRE TECH TOOLS');
console.log('❒  CREATOR : CODEBREAKER');
console.log('❒  VERSION : 3.0 VIP');
console.log('❒  OWNER   : @darkempdev');
console.log('❒  STATUS  : INITIALIZING...');
console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n');

initializeDB();

// ==================== MESSAGE HANDLER ====================
bot.on('message', async (msg) => {
    if (!msg.text && !msg.document && !msg.photo) return;
    
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // Log message
    logger.userAction(userId, `Message: ${text.substring(0, 50)}...`);
    
    // Check if user is banned
    if (db.users[userId] && db.users[userId].is_banned) {
        const banMsg = `⛔ You are banned from using this bot.\nReason: ${db.users[userId].ban_reason}`;
        if (db.users[userId].ban_until) {
            banMsg += `\nUntil: ${new Date(db.users[userId].ban_until).toLocaleString()}`;
        }
        return bot.sendMessage(chatId, banMsg);
    }
    
    // Check maintenance mode
    if (db.settings.maintenance && !isAdmin(userId)) {
        return bot.sendMessage(chatId, db.settings.maintenance_message);
    }
    
    // Handle button text messages
    if (text === '🛡️ OBFUSCATE CODE') {
        return bot.sendMessage(chatId, 'Send JavaScript code to obfuscate:\n/obfuscate <code>\nOr reply to .js file with: /obfuscate doc');
    } else if (text === '🔓 DEOBFUSCATE') {
        return bot.sendMessage(chatId, 'Send obfuscated code to deobfuscate:\n/deobfuscate <code>\nOr reply to .js file with: /deobfuscate doc');
    } else if (text === '🔐 ENCRYPT') {
        return bot.sendMessage(chatId, 'Encrypt text/files:\n/encrypt <text> [algorithm] [password]\nAlgorithms: aes, des, 3des, xor, base64, hex, rot13, rot47, caesar');
    } else if (text === '🔑 DECRYPT') {
        return bot.sendMessage(chatId, 'Decrypt text/files:\n/decrypt <text> [algorithm] [password]\nUse /decrypt auto <text> for automatic detection');
    } else if (text === '📁 ZIP TOOLS') {
        return handleZipTools(msg);
    } else if (text === '🌐 URL TOOLS') {
        return handleUrlTools(msg);
    } else if (text === '📸 QR CODE') {
        return handleQRCode(msg);
    } else if (text === '🔍 SCANNER') {
        return handleScanner(msg);
    } else if (text === '⚙️ SETTINGS') {
        return handleSettings(msg);
    } else if (text === 'ℹ️ HELP') {
        return handleHelp(msg);
    } else if (text === '/tools') {
        return bot.sendMessage(chatId, 'Select a tool:', { reply_markup: menuModule.getToolsMenu() });
    }
    
    // Update user activity
    if (!db.users[userId]) {
        db.users[userId] = {
            id: userId,
            username: msg.from.username || '',
            first_name: msg.from.first_name || '',
            last_name: msg.from.last_name || '',
            join_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_commands: 1,
            is_premium: false,
            premium_until: null,
            plan: 'FREE',
            is_banned: false
        };
        db.stats.total_users++;
    } else {
        db.users[userId].last_active = new Date().toISOString();
        db.users[userId].total_commands++;
    }
    db.stats.total_commands++;
    db.save('users');
    db.save('stats');
});

// ==================== COMMAND HANDLERS ====================

// START COMMAND
bot.onText(/\/start/, async (msg) => {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    logger.command(userId, '/start');
    
    // Check verification
    const verified = await verificationModule.requireVerification(bot, msg, config);
    if (!verified) return;
    
    const premiumStatus = premiumModule.checkPremiumStatus(userId);
    const welcomeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  WELCOME TO DARK EMPIRE TECH TOOLS
❒  USER: ${msg.from.first_name}
❒  ID: ${userId}
❒  STATUS: ${premiumStatus.isPremium ? '⭐ PREMIUM' : 'FREE'}
${premiumStatus.isPremium ? `❒  EXPIRES: ${new Date(premiumStatus.expires).toLocaleDateString()}` : ''}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Use the menu below or commands:

/obfuscate - Obfuscate JavaScript
/deobfuscate - Deobfuscate code
/encrypt - Encrypt files/text
/decrypt - Decrypt files/text
/hash - Generate hashes
/url - Shorten URL
/qr - Generate QR Code
/scan - Website scanner
/tools - All tools menu
/help - Help & Support

Owner: @darkempdev
Channel: @darkempiretech`;
    
    bot.sendMessage(chatId, welcomeMsg, menuModule.getMainMenu());
});

// HELP COMMAND
function handleHelp(msg) {
    const helpMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  DARK EMPIRE TECH TOOLS - HELP
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

❒  CODE TOOLS:
/obfuscate <code> - Obfuscate JavaScript
/deobfuscate <code> - Deobfuscate code

❒  ENCRYPTION TOOLS:
/encrypt <text> [algo] - Encrypt text
/decrypt <text> [algo] - Decrypt text
/password [length] - Generate password

❒  FILE TOOLS:
/zip - Compress to ZIP
/unzip - Extract ZIP
/hash <text> - Generate hash

❒  WEB TOOLS:
/url <link> - Shorten URL
/qr <text> - Generate QR Code
/scan <url> - Website scanner
/port <ip> - Port scanner
/dns <domain> - DNS lookup

❒  CONVERTER TOOLS:
/base64 <text> - Base64 encode/decode
/json <json> - Format JSON
/csv <text> - CSV to JSON

❒  ADMIN (Owner):
/panel - Admin panel
/ban <id> - Ban user
/addprem <id> - Add premium
/broadcast <msg> - Broadcast

❒  SUPPORT:
Owner: @darkempdev
Channel: @darkempiretech

❒  PREMIUM FEATURES:
• Unlimited file size
• Priority processing
• Batch operations
• Advanced encryption`;
    
    bot.sendMessage(msg.chat.id, helpMsg);
}

// ==================== ENCRYPTION/DECRYPTION ====================

// ENCRYPT COMMAND
bot.onText(/\/encrypt/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/encrypt', '').trim();
    
    logger.command(userId, '/encrypt');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  ENCRYPTION TOOL
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/encrypt <text> [algorithm] [password]

Algorithms: aes, des, 3des, xor, base64, hex, rot13, rot47, caesar

Examples:
/encrypt hello world aes mypassword
/encrypt secret base64
/encrypt text rot13

Default: AES-256-CBC with default password`);
    }
    
    try {
        const parts = text.split(' ');
        const content = parts[0];
        const algorithm = parts[1] || 'aes';
        const password = parts[2] || config.ENCRYPTION.DEFAULT_PASSWORD;
        
        let result;
        
        switch (algorithm.toLowerCase()) {
            case 'aes':
                result = encryption.aesEncrypt(content, password);
                break;
            case 'des':
                result = encryption.desEncrypt(content, password);
                break;
            case '3des':
                result = encryption.tripleDesEncrypt(content, password);
                break;
            case 'xor':
                result = encryption.xorEncrypt(content, password);
                break;
            case 'base64':
                result = encryption.base64Encode(content);
                break;
            case 'hex':
                result = encryption.hexEncode(content);
                break;
            case 'rot13':
                result = encryption.rotEncrypt(content, 'rot13');
                break;
            case 'rot47':
                result = encryption.rotEncrypt(content, 'rot47');
                break;
            case 'caesar':
                const shift = parseInt(parts[2]) || 3;
                result = encryption.caesarEncrypt(content, shift);
                break;
            default:
                return bot.sendMessage(chatId, `❌ Unknown algorithm. Available: ${config.ENCRYPTION.ALLOWED_ALGORITHMS.join(', ')}`);
        }
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  ENCRYPTION SUCCESSFUL
❒  Algorithm: ${result.algorithm}
❒  Size: ${result.length} characters
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`
${result.encrypted || result.encoded}
\`\`\`

${algorithm === 'aes' ? '🔑 Password: ' + password.substring(0, 3) + '***' : ''}
${algorithm === 'caesar' ? '🔄 Shift: ' + result.shift : ''}`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Encryption error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// DECRYPT COMMAND
bot.onText(/\/decrypt/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/decrypt', '').trim();
    
    logger.command(userId, '/decrypt');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  DECRYPTION TOOL
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/decrypt <text> [algorithm] [password]

Algorithms: aes, des, 3des, xor, base64, hex, rot13, rot47, caesar

Examples:
/decrypt U2FsdGVkX1/... aes mypassword
/decrypt aGVsbG8= base64
/decrypt grfg rot13

Try /decrypt auto <text> for automatic detection`);
    }
    
    try {
        const parts = text.split(' ');
        const content = parts[0];
        const algorithm = parts[1] || 'aes';
        const password = parts[2] || config.ENCRYPTION.DEFAULT_PASSWORD;
        
        let result;
        
        if (algorithm.toLowerCase() === 'auto') {
            result = decryption.autoDecrypt(content, { tryCaesar: true });
            
            if (result.success) {
                let response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  AUTO-DECRYPTION RESULTS
❒  Attempts: ${result.attempts}
❒  Best Guess: ${result.bestGuess.algorithm}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`
${result.bestGuess.decrypted || result.bestGuess.decoded}
\`\`\`

Other possible algorithms:`;
                
                result.results.forEach((r, i) => {
                    if (i > 0) {
                        response += `\n${r.algorithm}: ${(r.decrypted || r.decoded).substring(0, 50)}...`;
                    }
                });
                
                await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            } else {
                await bot.sendMessage(chatId, '❌ Could not automatically decrypt the text. Try specifying algorithm.');
            }
            return;
        }
        
        switch (algorithm.toLowerCase()) {
            case 'aes':
                result = decryption.aesDecrypt(content, password);
                break;
            case 'des':
                result = decryption.desDecrypt(content, password);
                break;
            case '3des':
                result = decryption.tripleDesDecrypt(content, password);
                break;
            case 'xor':
                result = decryption.xorDecrypt(content, password);
                break;
            case 'base64':
                result = decryption.base64Decode(content);
                break;
            case 'hex':
                result = decryption.hexDecode(content);
                break;
            case 'rot13':
                result = decryption.rotDecrypt(content, 'rot13');
                break;
            case 'rot47':
                result = decryption.rotDecrypt(content, 'rot47');
                break;
            case 'caesar':
                const shift = parseInt(parts[2]) || 3;
                result = decryption.caesarDecrypt(content, shift);
                break;
            default:
                return bot.sendMessage(chatId, `❌ Unknown algorithm. Available: ${config.ENCRYPTION.ALLOWED_ALGORITHMS.join(', ')}`);
        }
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  DECRYPTION SUCCESSFUL
❒  Algorithm: ${result.algorithm}
❒  Size: ${result.length} characters
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`
${result.decrypted || result.decoded}
\`\`\`

${algorithm === 'aes' ? '🔑 Password used: ' + password.substring(0, 3) + '***' : ''}
${algorithm === 'caesar' ? '🔄 Shift: ' + result.shift : ''}`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Decryption error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// PASSWORD GENERATOR
bot.onText(/\/password/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/password', '').trim();
    
    logger.command(userId, '/password');
    
    const length = parseInt(text) || 16;
    
    if (length < 4 || length > 64) {
        return bot.sendMessage(chatId, '❌ Password length must be between 4 and 64 characters.');
    }
    
    try {
        const result = encryption.generatePassword(length, {
            uppercase: true,
            lowercase: true,
            numbers: true,
            symbols: true
        });
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  PASSWORD GENERATED
❒  Length: ${result.length}
❒  Strength: ${result.strength}
❒  Entropy: ${result.entropy} bits
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`
${result.password}
\`\`\`

🔒 Keep this password secure!
📊 Character set size: ${result.charsetSize}`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Password generation error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== HASH TOOLS ====================

bot.onText(/\/hash/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/hash', '').trim();
    
    logger.command(userId, '/hash');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  HASH GENERATOR
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/hash <text> [algorithm]

Algorithms: md5, sha1, sha256, sha512, all

Examples:
/hash password sha256
/hash secret all

Default: SHA-256`);
    }
    
    try {
        const parts = text.split(' ');
        const content = parts[0];
        const algorithm = parts[1] || 'sha256';
        
        let result;
        
        if (algorithm.toLowerCase() === 'all') {
            result = hashTools.generateAllHashes(content);
        } else {
            result = hashTools.generateHash(content, algorithm);
        }
        
        if (result.success) {
            let response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  HASH GENERATED
❒  Algorithm: ${result.algorithm || 'Multiple'}
❒  Length: ${result.length || 'Various'}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
            
            if (algorithm === 'all') {
                for (const [algo, hash] of Object.entries(result.hashes)) {
                    response += `**${algo.toUpperCase()}**: \`${hash}\`\n`;
                }
            } else {
                response += `\`\`\`\n${result.hash}\n\`\`\``;
            }
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Hash generation error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== URL TOOLS ====================

bot.onText(/\/url/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/url', '').trim();
    
    logger.command(userId, '/url');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  URL SHORTENER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/url <long_url>

Example:
/url https://example.com/very/long/url`);
    }
    
    try {
        const result = await urlShortener.shortenURL(text);
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  URL SHORTENED
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

**Original**: ${text.substring(0, 50)}...
**Shortened**: ${result.shortUrl}

📊 Stats: Click tracking available`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('URL shortening error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== QR CODE ====================

bot.onText(/\/qr/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/qr', '').trim();
    
    logger.command(userId, '/qr');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  QR CODE GENERATOR
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/qr <text_or_url>

Example:
/qr https://example.com
/qr Hello World`);
    }
    
    try {
        const result = await qrGenerator.generateQR(text);
        
        if (result.success) {
            await bot.sendPhoto(chatId, result.filePath, {
                caption: `QR Code for: ${text.substring(0, 30)}...`
            });
            
            // Clean up temp file
            fs.unlinkSync(result.filePath);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('QR generation error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== SCANNER TOOLS ====================

bot.onText(/\/scan/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/scan', '').trim();
    
    logger.command(userId, '/scan');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  WEBSITE SCANNER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/scan <url>

Example:
/scan https://example.com
/scan example.com`);
    }
    
    try {
        const url = text.startsWith('http') ? text : `https://${text}`;
        const result = await scanner.websiteScanner(url);
        
        if (result.success) {
            let response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  WEBSITE SCAN RESULTS
❒  URL: ${result.url}
❒  Status: ${result.status}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

**Title**: ${result.info.title || 'N/A'}
**Description**: ${result.info.description || 'N/A'}
**Links**: ${result.info.links}
**Images**: ${result.info.images}
**Size**: ${formatBytes(result.info.size)}

**Security Headers**:`;
            
            for (const [header, value] of Object.entries(result.security)) {
                response += `\n${header}: ${value}`;
            }
            
            response += `\n\n**Technologies**: ${result.technologies.join(', ')}`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Scan error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== PORT SCANNER ====================

bot.onText(/\/port/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/port', '').trim();
    
    logger.command(userId, '/port');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  PORT SCANNER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/port <ip_or_domain>

Example:
/port 192.168.1.1
/port example.com`);
    }
    
    try {
        const result = await networkTools.portScanner(text);
        
        if (result.success) {
            let response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  PORT SCAN RESULTS
❒  Host: ${result.host}
❒  Scanned: ${result.scannedPorts} ports
❒  Open: ${result.openPorts} ports
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
            
            if (result.open.length > 0) {
                response += '**OPEN PORTS**:\n';
                result.open.forEach(port => {
                    response += `🔓 ${port.port} (${port.service}) - ${port.status}\n`;
                });
            } else {
                response += 'No open ports found.\n';
            }
            
            response += `\nScan completed at: ${new Date().toLocaleTimeString()}`;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Port scan error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== DNS LOOKUP ====================

bot.onText(/\/dns/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/dns', '').trim();
    
    logger.command(userId, '/dns');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  DNS LOOKUP
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/dns <domain>

Example:
/dns example.com`);
    }
    
    try {
        const result = await networkTools.dnsLookup(text);
        
        if (result.success) {
            let response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  DNS LOOKUP RESULTS
❒  Domain: ${result.domain}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n\n`;
            
            for (const [type, records] of Object.entries(result.records)) {
                response += `**${type}**:\n`;
                if (Array.isArray(records)) {
                    records.forEach(record => {
                        if (typeof record === 'object') {
                            response += `  • ${JSON.stringify(record)}\n`;
                        } else {
                            response += `  • ${record}\n`;
                        }
                    });
                } else if (typeof records === 'object') {
                    response += `  • ${JSON.stringify(records)}\n`;
                } else {
                    response += `  • ${records}\n`;
                }
                response += '\n';
            }
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('DNS lookup error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== CONVERTER TOOLS ====================

bot.onText(/\/base64/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/base64', '').trim();
    
    logger.command(userId, '/base64');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  BASE64 CONVERTER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/base64 <text> - Encode to Base64
/base64 decode <text> - Decode from Base64

Examples:
/base64 hello world
/base64 decode aGVsbG8gd29ybGQ=`);
    }
    
    try {
        let result;
        
        if (text.toLowerCase().startsWith('decode ')) {
            const encoded = text.substring(7);
            result = converter.base64Decode(encoded);
        } else {
            result = converter.base64Encode(text);
        }
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  BASE64 ${text.toLowerCase().startsWith('decode ') ? 'DECODED' : 'ENCODED'}
❒  Size: ${result.length} characters
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`
${result.decoded || result.encoded}
\`\`\``;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        logger.error('Base64 error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/json/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/json', '').trim();
    
    logger.command(userId, '/json');
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  JSON FORMATTER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/json <json_string>

Example:
/json {"name":"John","age":30}`);
    }
    
    try {
        const result = converter.jsonFormatter(text);
        
        if (result.success) {
            const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  JSON FORMATTED
❒  Valid: ${result.isValid ? '✅ Yes' : '❌ No'}
❒  Size: ${result.size} characters
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`json
${result.formatted.substring(0, 1500)}${result.formatted.length > 1500 ? '...' : ''}
\`\`\``;
            
            await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, `❌ Invalid JSON: ${result.error}`);
        }
    } catch (error) {
        logger.error('JSON error', { userId, error: error.message });
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ==================== ADMIN COMMANDS ====================

bot.onText(/\/panel/, (msg) => {
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    logger.adminAction(userId, 'Opened admin panel');
    
    bot.sendMessage(msg.chat.id, '╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n❒  ADMIN CONTROL PANEL\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷', {
        reply_markup: menuModule.getAdminMenu()
    });
});

bot.onText(/\/ban (\d+) ?(.+)?/, (msg, match) => {
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const targetId = match[1];
    const reason = match[2] || 'No reason provided';
    
    logger.adminAction(userId, `Banned user ${targetId}`, { reason });
    
    if (adminModule.banUser(targetId, reason)) {
        bot.sendMessage(msg.chat.id, `✅ User ${targetId} banned. Reason: ${reason}`);
    } else {
        bot.sendMessage(msg.chat.id, '❌ User not found.');
    }
});

bot.onText(/\/addprem (\d+)/, (msg, match) => {
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const targetId = match[1];
    
    logger.adminAction(userId, `Added premium to ${targetId}`);
    
    if (adminModule.addPremium(targetId)) {
        bot.sendMessage(msg.chat.id, `✅ User ${targetId} added to premium.`);
        bot.sendMessage(targetId, '🎉 You have been upgraded to PREMIUM status! Enjoy advanced features.');
    } else {
        bot.sendMessage(msg.chat.id, '❌ User not found.');
    }
});

bot.onText(/\/broadcast (.+)/, async (msg, match) => {
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const message = match[1];
    
    logger.adminAction(userId, 'Started broadcast');
    
    await bot.sendMessage(msg.chat.id, '📢 Starting broadcast to all users...');
    
    const result = await broadcastModule.sendBroadcast(bot, message);
    
    const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  BROADCAST COMPLETED
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

✅ Success: ${result.success}
❌ Failed: ${result.failed}
📊 Total: ${result.total}

${result.failed > 0 ? '\nFailed users have been removed from database.' : ''}`;
    
    bot.sendMessage(msg.chat.id, response);
});

bot.onText(/\/stats/, (msg) => {
    const userId = msg.from.id;
    
    if (!isAdmin(userId)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const statsMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  BOT STATISTICS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

❒ Users: ${Object.keys(db.users).length}
❒ Premium: ${db.premium.premium_users.length}
❒ Banned: ${db.banned.length}
❒ Commands: ${db.stats.total_commands}
❒ Files Processed: ${db.stats.files_processed}
❒ Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m
❒ Memory: ${formatBytes(process.memoryUsage().rss)}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  RECENT USERS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷`;

    // Get recent users
    const recentUsers = Object.values(db.users)
        .sort((a, b) => new Date(b.last_active) - new Date(a.last_active))
        .slice(0, 5);
    
    let userList = '';
    recentUsers.forEach(user => {
        userList += `\n👤 ${user.first_name} (${user.id}) - ${user.total_commands} commands`;
    });
    
    bot.sendMessage(msg.chat.id, statsMsg + userList);
});

// ==================== CALLBACK QUERY HANDLER ====================

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    try {
        if (data === 'tool_obf') {
            await bot.sendMessage(chatId, 'Send: /obfuscate <code>\nOr reply to file with: /obfuscate doc');
        } else if (data === 'tool_deob') {
            await bot.sendMessage(chatId, 'Send: /deobfuscate <code>\nOr reply to file with: /deobfuscate doc');
        } else if (data === 'tool_enc') {
            await bot.sendMessage(chatId, 'Send: /encrypt <text> [algorithm] [password]\nAlgorithms: aes, des, 3des, xor, base64, hex, rot13, rot47, caesar');
        } else if (data === 'tool_dec') {
            await bot.sendMessage(chatId, 'Send: /decrypt <text> [algorithm] [password]\nOr /decrypt auto <text> for automatic detection');
        } else if (data === 'tool_hash') {
            await bot.sendMessage(chatId, 'Send: /hash <text> [algorithm]\nAlgorithms: md5, sha1, sha256, sha512, all');
        } else if (data === 'tool_url') {
            await bot.sendMessage(chatId, 'Send: /url <long_url>');
        } else if (data === 'tool_qr') {
            await bot.sendMessage(chatId, 'Send: /qr <text_or_url>');
        } else if (data === 'tool_scan') {
            await bot.sendMessage(chatId, 'Send: /scan <url>\nOr /port <ip> for port scan\nOr /dns <domain> for DNS lookup');
        } else if (data === 'admin_stats') {
            if (!isAdmin(userId)) {
                return bot.answerCallbackQuery(callbackQuery.id, { text: 'Admin only!', show_alert: true });
            }
            
            const statsMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  BOT STATISTICS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

❒ Users: ${Object.keys(db.users).length}
❒ Premium: ${db.premium.premium_users.length}
❒ Banned: ${db.banned.length}
❒ Commands: ${db.stats.total_commands}
❒ Files: ${db.stats.files_processed}
❒ Uptime: ${Math.floor(process.uptime() / 3600)}h`;
            
            await bot.sendMessage(chatId, statsMsg);
        } else if (data === 'verify_joined') {
            const verified = await verificationModule.checkChannelMembership(bot, userId, config);
            if (verified) {
                await bot.sendMessage(chatId, '✅ Verification successful! Use /start to begin.');
            } else {
                await bot.sendMessage(chatId, '❌ Please join the required channels first.');
            }
        }
        
        bot.answerCallbackQuery(callbackQuery.id, { text: '✅', show_alert: false });
    } catch (error) {
        logger.error('Callback error', { userId, error: error.message });
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error!', show_alert: true });
    }
});

// ==================== HELPER FUNCTIONS ====================

function handleSettings(msg) {
    const userId = msg.from.id;
    const premiumStatus = premiumModule.checkPremiumStatus(userId);
    
    const settingsMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  USER SETTINGS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

👤 User: ${msg.from.first_name}
🆔 ID: ${userId}
⭐ Status: ${premiumStatus.isPremium ? 'PREMIUM' : 'FREE'}
${premiumStatus.isPremium ? `📅 Expires: ${new Date(premiumStatus.expires).toLocaleDateString()}` : ''}
📊 Commands: ${db.users[userId] ? db.users[userId].total_commands : 0}
📅 Joined: ${db.users[userId] ? new Date(db.users[userId].join_date).toLocaleDateString() : 'Just now'}

💎 Upgrade to Premium:
• Unlimited file size
• Priority processing
• Advanced tools
• No advertisements

Contact @darkempdev for premium access.`;
    
    bot.sendMessage(msg.chat.id, settingsMsg);
}

function handleZipTools(msg) {
    bot.sendMessage(msg.chat.id, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  ZIP TOOLS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Coming soon! ZIP compression and extraction tools.

Features:
• Create ZIP files
• Extract ZIP archives
• Password protection
• Batch processing

Stay tuned for updates!`);
}

function handleUrlTools(msg) {
    bot.sendMessage(msg.chat.id, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  URL TOOLS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Available commands:
/url <link> - Shorten URL
/qr <text> - Generate QR Code
/scan <url> - Website scanner

More tools coming soon!`);
}

function handleQRCode(msg) {
    bot.sendMessage(msg.chat.id, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  QR CODE GENERATOR
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/qr <text_or_url>

Examples:
/qr https://example.com
/qr Hello World
/qr WIFI:S:MyNetwork;T:WPA;P:password;;

Creates QR codes for URLs, text, WiFi, and more!`);
}

function handleScanner(msg) {
    bot.sendMessage(msg.chat.id, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  SECURITY SCANNER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Available scanners:
/scan <url> - Website security scan
/port <ip> - Port scanner
/dns <domain> - DNS lookup
/subdomain <domain> - Subdomain scanner

Advanced security tools for penetration testing.`);
}

// ==================== ERROR HANDLING ====================

bot.on('polling_error', (error) => {
    logger.error('Polling error', { error: error.message });
});

bot.on('webhook_error', (error) => {
    logger.error('Webhook error', { error: error.message });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason: reason });
});

// ==================== START BOT ====================

console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
console.log('❒  BOT STARTED SUCCESSFULLY!');
console.log(`❒  BOT: ${config.BOT_NAME}`);
console.log(`❒  OWNER: @darkempdev`);
console.log(`❒  USERS: ${Object.keys(db.users).length}`);
console.log(`❒  PREMIUM: ${db.premium.premium_users.length}`);
console.log(`❒  TOOLS: 15+ tools available`);
console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');