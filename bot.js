const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('./config.json');
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

// Load modules
const adminModule = require('./modules/admin');
const verificationModule = require('./modules/user_verification');
const menuModule = require('./modules/menu');
const fileHandler = require('./modules/file_handler');
const obfuscator = require('./tools/obfuscator');
const deobfuscator = require('./tools/deobfuscator');

// Database functions
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

// ==================== STARTUP ====================
console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
console.log('❒  BOTNAME : DARK EMPIRE TECH TOOLS');
console.log('❒  CREATOR : CODEBREAKER');
console.log('❒  VERSION : 2.0 VIP');
console.log('❒  OWNER   : @darkempdev');
console.log('❒  STATUS  : INITIALIZING...');
console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n');

initializeDB();

// ==================== MESSAGE HANDLER ====================
bot.on('message', async (msg) => {
    // Ignore non-text messages except for commands
    if (!msg.text && !msg.document) return;
    
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    // Check if user is banned
    if (db.users[userId] && db.users[userId].is_banned) {
        const banMsg = `⛔ You are banned from using this bot.\nReason: ${db.users[userId].ban_reason}`;
        if (db.users[userId].ban_until) {
            banMsg += `\nUntil: ${new Date(db.users[userId].ban_until).toLocaleString()}`;
        }
        return bot.sendMessage(chatId, banMsg);
    }
    
    // Check maintenance mode
    if (db.settings.maintenance && !adminModule.isAdmin(userId, config)) {
        return bot.sendMessage(chatId, db.settings.maintenance_message);
    }
    
    // Handle button text messages
    if (text === '🛡️ OBFUSCATE CODE') {
        return bot.sendMessage(chatId, 'Send JavaScript code to obfuscate:\n/obfuscate <code>\nOr reply to .js file with: /obfuscate doc');
    } else if (text === '🔓 DEOBFUSCATE') {
        return bot.sendMessage(chatId, 'Send obfuscated code to deobfuscate:\n/deobfuscate <code>\nOr reply to .js file with: /deobfuscate doc');
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
    
    // Check verification
    const verified = await verificationModule.requireVerification(bot, msg, config);
    if (!verified) return;
    
    const welcomeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  WELCOME TO DARK EMPIRE TECH TOOLS
❒  USER: ${msg.from.first_name}
❒  ID: ${userId}
❒  STATUS: ${isPremium(userId) ? '⭐ PREMIUM' : 'FREE'}
❒  COMMANDS: ${db.users[userId] ? db.users[userId].total_commands : 0}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Use the menu below or commands:

/obfuscate - Obfuscate JavaScript
/deobfuscate - Deobfuscate code
/encrypt - Encrypt files/text
/decrypt - Decrypt files/text
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

❒  FILE TOOLS:
/encrypt - Encrypt files
/decrypt - Decrypt files
/zip - Compress to ZIP
/unzip - Extract ZIP

❒  WEB TOOLS:
/url <link> - Shorten URL
/qr <text> - Generate QR Code
/hash <text> - Generate hash

❒  ADMIN (Owner):
/panel - Admin panel
/ban <id> - Ban user
/addprem <id> - Add premium

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

// OBFUSCATE COMMAND
bot.onText(/\/obfuscate/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text.replace('/obfuscate', '').trim();
    
    if (!text) {
        return bot.sendMessage(chatId, `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  OBFUSCATION TOOL
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

Usage:
/obfuscate <javascript code>
/obfuscate doc (reply to .js file)

Example:
/obfuscate console.log("hello")`);
    }
    
    try {
        if (text === 'doc' && msg.reply_to_message && msg.reply_to_message.document) {
            const fileBuffer = await fileHandler.downloadTelegramFile(bot, msg.reply_to_message.document.file_id, config.BOT_TOKEN);
            const result = await obfuscator.obfuscateFile(fileBuffer, 'high');
            
            if (result.success) {
                await bot.sendDocument(chatId, result.filePath, {
                    caption: `Obfuscated by Dark Empire Tech Tools\nSize: ${result.length} chars`
                });
                fs.unlinkSync(result.filePath);
                db.stats.files_processed++;
                db.save('stats');
            } else {
                throw new Error(result.error);
            }
        } else {
            const result = await obfuscator.obfuscateCode(text, 'high');
            
            if (result.success) {
                const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  CODE OBFUSCATED
❒  SIZE: ${result.length} chars
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`javascript
${result.code.substring(0, 1000)}${result.length > 1000 ? '...' : ''}
\`\`\``;
                
                await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            } else {
                throw new Error(result.error);
            }
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// DEOBFUSCATE COMMAND
bot.onText(/\/deobfuscate/, async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.replace('/deobfuscate', '').trim();
    
    if (!text) {
        return bot.sendMessage(chatId, 'Send obfuscated code or reply to .js file with "doc"');
    }
    
    try {
        if (text === 'doc' && msg.reply_to_message && msg.reply_to_message.document) {
            const fileBuffer = await fileHandler.downloadTelegramFile(bot, msg.reply_to_message.document.file_id, config.BOT_TOKEN);
            const result = await deobfuscator.deobfuscateFile(fileBuffer);
            
            if (result.success) {
                await bot.sendDocument(chatId, result.filePath, {
                    caption: `Deobfuscated by Dark Empire Tech Tools`
                });
                fs.unlinkSync(result.filePath);
                db.stats.files_processed++;
                db.save('stats');
            } else {
                throw new Error(result.error);
            }
        } else {
            const result = await deobfuscator.deobfuscateCode(text);
            
            if (result.success) {
                const response = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  CODE DEOBFUSCATED
❒  SIZE: ${result.length} chars
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

\`\`\`javascript
${result.code.substring(0, 1000)}${result.length > 1000 ? '...' : ''}
\`\`\``;
                
                await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
            } else {
                throw new Error(result.error);
            }
        }
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

// ADMIN PANEL
bot.onText(/\/panel/, (msg) => {
    if (!adminModule.isAdmin(msg.from.id, config)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    bot.sendMessage(msg.chat.id, '╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷\n❒  ADMIN CONTROL PANEL\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷', {
        reply_markup: menuModule.getAdminMenu()
    });
});

// ADMIN: BAN USER
bot.onText(/\/ban (\d+) ?(.+)?/, (msg, match) => {
    if (!adminModule.isAdmin(msg.from.id, config)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const targetId = match[1];
    const reason = match[2] || 'No reason provided';
    
    if (adminModule.banUser(targetId, reason)) {
        bot.sendMessage(msg.chat.id, `✅ User ${targetId} banned.`);
    } else {
        bot.sendMessage(msg.chat.id, '❌ User not found.');
    }
});

// ADMIN: ADD PREMIUM
bot.onText(/\/addprem (\d+)/, (msg, match) => {
    if (!adminModule.isAdmin(msg.from.id, config)) {
        return bot.sendMessage(msg.chat.id, '⛔ Admin only.');
    }
    
    const targetId = match[1];
    
    if (adminModule.addPremium(targetId)) {
        bot.sendMessage(msg.chat.id, `✅ User ${targetId} added to premium.`);
        bot.sendMessage(targetId, '🎉 You have been upgraded to PREMIUM!');
    } else {
        bot.sendMessage(msg.chat.id, '❌ User not found.');
    }
});

// CALLBACK QUERY HANDLER
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    try {
        if (data === 'tool_obf') {
            await bot.sendMessage(chatId, 'Send: /obfuscate <code>\nOr reply to file with: /obfuscate doc');
        } else if (data === 'tool_deob') {
            await bot.sendMessage(chatId, 'Send: /deobfuscate <code>\nOr reply to file with: /deobfuscate doc');
        } else if (data === 'admin_stats') {
            if (!adminModule.isAdmin(userId, config)) {
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
        
        bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        console.error('Callback error:', error);
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Error!', show_alert: true });
    }
});

// ==================== START BOT ====================
console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');
console.log('❒  BOT STARTED SUCCESSFULLY!');
console.log(`❒  BOT: ${config.BOT_NAME}`);
console.log(`❒  OWNER: @darkempdev`);
console.log(`❒  USERS: ${Object.keys(db.users).length}`);
console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷');