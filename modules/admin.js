const fs = require('fs');
const path = require('path');

module.exports = {
    isAdmin: function(userId, config) {
        return userId == config.OWNER_ID || (config.ADMIN_IDS && config.ADMIN_IDS.includes(userId));
    },
    
    banUser: function(userId, reason = 'Violation of terms', days = 0) {
        const db = {
            users: require('../database/users.json'),
            banned: require('../database/banned.json'),
            stats: require('../database/stats.json')
        };
        
        if (db.users[userId]) {
            db.users[userId].is_banned = true;
            db.users[userId].ban_reason = reason;
            
            if (days > 0) {
                const banUntil = new Date();
                banUntil.setDate(banUntil.getDate() + days);
                db.users[userId].ban_until = banUntil.toISOString();
            } else {
                db.users[userId].ban_until = null;
            }
            
            if (!db.banned.includes(parseInt(userId))) {
                db.banned.push(parseInt(userId));
            }
            
            db.stats.total_banned = db.banned.length;
            
            fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
            fs.writeFileSync('./database/banned.json', JSON.stringify(db.banned, null, 2));
            fs.writeFileSync('./database/stats.json', JSON.stringify(db.stats, null, 2));
            
            return true;
        }
        return false;
    },
    
    unbanUser: function(userId) {
        const db = {
            users: require('../database/users.json'),
            banned: require('../database/banned.json')
        };
        
        if (db.users[userId]) {
            db.users[userId].is_banned = false;
            db.users[userId].ban_reason = '';
            db.users[userId].ban_until = null;
            
            db.banned = db.banned.filter(id => id !== parseInt(userId));
            
            fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
            fs.writeFileSync('./database/banned.json', JSON.stringify(db.banned, null, 2));
            
            return true;
        }
        return false;
    },
    
    addPremium: function(userId, days = 30) {
        const db = {
            users: require('../database/users.json'),
            premium: require('../database/premium.json')
        };
        
        if (db.users[userId]) {
            const premiumUntil = new Date();
            premiumUntil.setDate(premiumUntil.getDate() + days);
            
            db.users[userId].is_premium = true;
            db.users[userId].premium_until = premiumUntil.toISOString();
            db.users[userId].plan = 'VIP';
            
            if (!db.premium.premium_users.includes(parseInt(userId))) {
                db.premium.premium_users.push(parseInt(userId));
            }
            
            db.premium.subscriptions[userId] = {
                start_date: new Date().toISOString(),
                end_date: premiumUntil.toISOString(),
                plan: 'VIP',
                added_by: 'admin'
            };
            
            fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
            fs.writeFileSync('./database/premium.json', JSON.stringify(db.premium, null, 2));
            
            return true;
        }
        return false;
    },
    
    removePremium: function(userId) {
        const db = {
            users: require('../database/users.json'),
            premium: require('../database/premium.json')
        };
        
        if (db.users[userId]) {
            db.users[userId].is_premium = false;
            db.users[userId].premium_until = null;
            db.users[userId].plan = 'FREE';
            
            db.premium.premium_users = db.premium.premium_users.filter(id => id !== parseInt(userId));
            delete db.premium.subscriptions[userId];
            
            fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
            fs.writeFileSync('./database/premium.json', JSON.stringify(db.premium, null, 2));
            
            return true;
        }
        return false;
    },
    
    broadcast: async function(bot, message, premiumOnly = false) {
        const db = {
            users: require('../database/users.json'),
            premium: require('../database/premium.json')
        };
        
        let count = 0;
        const users = Object.keys(db.users);
        
        for (const userId of users) {
            try {
                if (premiumOnly && !db.users[userId].is_premium) {
                    continue;
                }
                
                await bot.sendMessage(userId, message);
                count++;
                
                // Delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to send to ${userId}:`, error.message);
            }
        }
        
        return count;
    }
};
