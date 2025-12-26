module.exports = {
    getMainMenu: function() {
        return {
            reply_markup: {
                keyboard: [
                    ['🛡️ OBFUSCATE CODE', '🔓 DEOBFUSCATE'],
                    ['🔐 ENCRYPT', '🔑 DECRYPT'],
                    ['📁 ZIP TOOLS', '🌐 WEB TOOLS'],
                    ['📸 QR CODE', '🔍 SCANNER'],
                    ['⚙️ SETTINGS', 'ℹ️ HELP']
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };
    },
    
    getToolsMenu: function() {
        return {
            inline_keyboard: [
                [
                    { text: '🛡️ OBFUSCATE', callback_data: 'tool_obf' },
                    { text: '🔓 DEOBFUSCATE', callback_data: 'tool_deob' }
                ],
                [
                    { text: '🔐 ENCRYPT', callback_data: 'tool_enc' },
                    { text: '🔑 DECRYPT', callback_data: 'tool_dec' }
                ],
                [
                    { text: '📁 ZIP', callback_data: 'tool_zip' },
                    { text: '📂 UNZIP', callback_data: 'tool_unzip' }
                ],
                [
                    { text: '🌐 URL SHORT', callback_data: 'tool_url' },
                    { text: '📸 QR CODE', callback_data: 'tool_qr' }
                ],
                [
                    { text: '🔍 SCANNER', callback_data: 'tool_scan' },
                    { text: '📊 HASH', callback_data: 'tool_hash' }
                ]
            ]
        };
    },
    
    getAdminMenu: function() {
        return {
            inline_keyboard: [
                [
                    { text: '📊 STATS', callback_data: 'admin_stats' },
                    { text: '👥 USERS', callback_data: 'admin_users' }
                ],
                [
                    { text: '⭐ PREMIUM', callback_data: 'admin_premium' },
                    { text: '🔨 BAN USER', callback_data: 'admin_ban' }
                ],
                [
                    { text: '📢 BROADCAST', callback_data: 'admin_broadcast' },
                    { text: '⚙️ SETTINGS', callback_data: 'admin_settings' }
                ],
                [
                    { text: '🔄 RESTART', callback_data: 'admin_restart' },
                    { text: '❌ SHUTDOWN', callback_data: 'admin_shutdown' }
                ]
            ]
        };
    },
    
    getPremiumMenu: function(isPremium = false) {
        const buttons = [
            [
                { text: '🛡️ ADVANCED OBFUSCATE', callback_data: 'prem_obf_adv' },
                { text: '🔓 BATCH DEOBFUSCATE', callback_data: 'prem_deob_batch' }
            ],
            [
                { text: '🔐 AES-256 ENCRYPT', callback_data: 'prem_enc_aes' },
                { text: '📁 MULTI-FILE ZIP', callback_data: 'prem_zip_multi' }
            ]
        ];
        
        if (!isPremium) {
            buttons.push([
                { text: '⭐ GET PREMIUM', callback_data: 'get_premium' }
            ]);
        }
        
        return {
            inline_keyboard: buttons
        };
    }
};

    getEncryptionMenu: function() {
        return {
            inline_keyboard: [
                [
                    { text: '🔐 AES-256', callback_data: 'enc_aes' },
                    { text: '🔓 DECRYPT AES', callback_data: 'dec_aes' }
                ],
                [
                    { text: '🔐 3DES', callback_data: 'enc_3des' },
                    { text: '🔓 DECRYPT 3DES', callback_data: 'dec_3des' }
                ],
                [
                    { text: '🔐 XOR', callback_data: 'enc_xor' },
                    { text: '🔓 DECRYPT XOR', callback_data: 'dec_xor' }
                ],
                [
                    { text: '📊 Base64', callback_data: 'enc_base64' },
                    { text: '📊 Hex', callback_data: 'enc_hex' }
                ],
                [
                    { text: '🌀 ROT13/47', callback_data: 'enc_rot' },
                    { text: '🔑 Gen Password', callback_data: 'gen_pass' }
                ],
                [
                    { text: '🔙 Back', callback_data: 'menu_main' }
                ]
            ]
        };
    }
