const axios = require('axios');

module.exports = {
    shortenURL: async function(url) {
        try {
            // Using is.gd as example
            const response = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
            
            if (response.data && response.data.startsWith('https://')) {
                return { success: true, shortUrl: response.data };
            } else {
                // Fallback to tinyurl
                const fallback = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
                return { success: true, shortUrl: fallback.data };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
