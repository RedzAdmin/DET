const crypto = require('crypto');
const bcrypt = require('bcryptjs');

module.exports = {
    generateHash: function(text, algorithm = 'sha256') {
        try {
            const hash = crypto.createHash(algorithm);
            hash.update(text);
            return {
                success: true,
                algorithm: algorithm,
                hash: hash.digest('hex'),
                length: hash.digest('hex').length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    generateAllHashes: function(text) {
        const algorithms = ['md5', 'sha1', 'sha256', 'sha512', 'ripemd160'];
        const results = {};
        
        algorithms.forEach(algo => {
            try {
                const hash = crypto.createHash(algo);
                hash.update(text);
                results[algo] = hash.digest('hex');
            } catch (error) {
                results[algo] = `Error: ${error.message}`;
            }
        });
        
        return { success: true, hashes: results };
    },
    
    bcryptHash: async function(text, rounds = 10) {
        try {
            const salt = await bcrypt.genSalt(rounds);
            const hash = await bcrypt.hash(text, salt);
            return {
                success: true,
                hash: hash,
                salt: salt,
                rounds: rounds
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    bcryptCompare: async function(text, hash) {
        try {
            const match = await bcrypt.compare(text, hash);
            return {
                success: true,
                match: match,
                text: text,
                hash: hash
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    hmac: function(text, key, algorithm = 'sha256') {
        try {
            const hmac = crypto.createHmac(algorithm, key);
            hmac.update(text);
            return {
                success: true,
                algorithm: algorithm,
                hmac: hmac.digest('hex'),
                key: key
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
