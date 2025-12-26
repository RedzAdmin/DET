const fs = require('fs');
const path = require('path');

module.exports = {
    sendBroadcast: async function(bot, message, options = {}) {
        const db = {
            users: require('../database/users.json'),
            premium: require('../database/premium.json')
        };
        
        const {
            premiumOnly = false,
            userIds = null,
            batchSize = 30,
            delay = 1000
        } = options;
        
        let usersToSend = [];
        
        if (userIds) {
            // Send to specific users
            usersToSend = userIds.filter(id => db.users[id]);
        } else if (premiumOnly) {
            // Send to premium users only
            usersToSend = db.premium.premium_users || [];
        } else {
            // Send to all users
            usersToSend = Object.keys(db.users);
        }
        
        const results = {
            total: usersToSend.length,
            success: 0,
            failed: 0,
            errors: []
        };
        
        // Process in batches to avoid rate limits
        for (let i = 0; i < usersToSend.length; i += batchSize) {
            const batch = usersToSend.slice(i, i + batchSize);
            
            const promises = batch.map(async (userId) => {
                try {
                    await bot.sendMessage(userId, message, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    });
                    results.success++;
                    return { userId, success: true };
                } catch (error) {
                    results.failed++;
                    results.errors.push({ userId, error: error.message });
                    
                    // Remove inactive users from database
                    if (error.response && error.response.statusCode === 403) {
                        delete db.users[userId];
                        fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
                    }
                    
                    return { userId, success: false, error: error.message };
                }
            });
            
            await Promise.all(promises);
            
            // Delay between batches
            if (i + batchSize < usersToSend.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // Save broadcast log
        const broadcastLog = {
            timestamp: new Date().toISOString(),
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            options: options,
            results: results
        };
        
        const logPath = path.join(__dirname, '../logs/broadcasts.log');
        fs.appendFileSync(logPath, JSON.stringify(broadcastLog) + '\n');
        
        return results;
    },
    
    scheduleBroadcast: function(bot, message, scheduleTime, options = {}) {
        const scheduleTimeDate = new Date(scheduleTime);
        const now = new Date();
        const delay = scheduleTimeDate.getTime() - now.getTime();
        
        if (delay <= 0) {
            return { success: false, error: 'Schedule time must be in the future' };
        }
        
        setTimeout(() => {
            this.sendBroadcast(bot, message, options);
        }, delay);
        
        return {
            success: true,
            scheduledFor: scheduleTimeDate.toISOString(),
            in: Math.floor(delay / 1000) + ' seconds'
        };
    },
    
    getBroadcastHistory: function(limit = 50) {
        try {
            const logPath = path.join(__dirname, '../logs/broadcasts.log');
            
            if (!fs.existsSync(logPath)) {
                return [];
            }
            
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n');
            
            return lines
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean)
                .reverse();
        } catch (error) {
            return { error: error.message };
        }
    }
};
