const TelegramBot = require('node-telegram-bot-api');

module.exports = {
    checkChannelMembership: async function(bot, userId, config) {
        try {
            // Check main channel
            if (config.CHANNEL) {
                const channel = config.CHANNEL.replace('@', '');
                try {
                    const member = await bot.getChatMember(channel, userId);
                    if (member.status === 'left' || member.status === 'kicked') {
                        return false;
                    }
                } catch (error) {
                    console.error('Channel check error:', error.message);
                }
            }
            
            // Check group if specified
            if (config.GROUP) {
                const group = config.GROUP.replace('@', '');
                try {
                    const member = await bot.getChatMember(group, userId);
                    if (member.status === 'left' || member.status === 'kicked') {
                        return false;
                    }
                } catch (error) {
                    console.error('Group check error:', error.message);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Verification error:', error);
            return true; // Allow if check fails
        }
    },
    
    requireVerification: async function(bot, msg, config) {
        const userId = msg.from.id;
        const chatId = msg.chat.id;
        
        const isMember = await this.checkChannelMembership(bot, userId, config);
        
        if (!isMember) {
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📢 Join Channel', url: `https://t.me/${config.CHANNEL.replace('@', '')}` },
                        { text: '👥 Join Group', url: `https://t.me/${config.GROUP.replace('@', '')}` }
                    ],
                    [
                        { text: '✅ I Have Joined', callback_data: 'verify_joined' }
                    ]
                ]
            };
            
            const message = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷
❒  VERIFICATION REQUIRED
╰━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

To use Dark Empire Tech Tools, you must join:

📢 Channel: ${config.CHANNEL}
👥 Group: ${config.GROUP}

After joining, click "I Have Joined" below.`;
            
            await bot.sendMessage(chatId, message, { reply_markup: keyboard });
            return false;
        }
        
        return true;
    }
};
