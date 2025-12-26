const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    generateLicenseKey: function(userId, days = 30) {
        const key = `DET-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        
        return {
            key: key,
            userId: userId,
            expires: expires.toISOString(),
            days: days,
            status: 'active'
        };
    },
    
    validateLicense: function(key) {
        try {
            const parts = key.split('-');
            if (parts[0] !== 'DET') return { valid: false, reason: 'Invalid format' };
            
            const userId = parts[1];
            const db = require('../database/premium.json');
            
            if (db.subscriptions && db.subscriptions[userId]) {
                const sub = db.subscriptions[userId];
                const expires = new Date(sub.end_date);
                
                if (expires > new Date()) {
                    return {
                        valid: true,
                        userId: userId,
                        expires: expires.toISOString(),
                        plan: sub.plan
                    };
                } else {
                    return { valid: false, reason: 'License expired' };
                }
            }
            
            return { valid: false, reason: 'License not found' };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    },
    
    getPremiumFeatures: function() {
        return {
            code_tools: {
                advanced_obfuscation: true,
                batch_processing: true,
                custom_settings: true
            },
            file_tools: {
                unlimited_size: true,
                password_protection: true,
                batch_operations: true
            },
            network_tools: {
                detailed_scans: true,
                api_access: true,
                priority_queue: true
            },
            benefits: {
                no_ads: true,
                priority_support: true,
                early_access: true
            }
        };
    },
    
    checkPremiumStatus: function(userId) {
        const db = {
            users: require('../database/users.json'),
            premium: require('../database/premium.json')
        };
        
        if (db.users[userId] && db.users[userId].is_premium) {
            const expires = new Date(db.users[userId].premium_until);
            const daysLeft = Math.ceil((expires - new Date()) / (1000 * 60 * 60 * 24));
            
            return {
                isPremium: true,
                expires: expires.toISOString(),
                daysLeft: daysLeft > 0 ? daysLeft : 0,
                plan: db.users[userId].plan || 'VIP'
            };
        }
        
        return { isPremium: false };
    }
};
