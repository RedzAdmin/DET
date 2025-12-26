const axios = require('axios');
const dns = require('dns').promises;

module.exports = {
    subdomainScanner: async function(domain, wordlist = null) {
        try {
            // Common subdomains if no wordlist provided
            const commonSubdomains = [
                'www', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'blog',
                'shop', 'store', 'admin', 'secure', 'portal', 'api',
                'dev', 'test', 'staging', 'demo', 'cdn', 'static',
                'webmail', 'support', 'help', 'docs', 'forum'
            ];
            
            const subdomainsToCheck = wordlist || commonSubdomains;
            const found = [];
            
            for (const subdomain of subdomainsToCheck) {
                const fullDomain = `${subdomain}.${domain}`;
                
                try {
                    await dns.resolve4(fullDomain);
                    found.push({
                        subdomain: fullDomain,
                        status: 'ACTIVE',
                        type: 'A'
                    });
                } catch (err) {
                    // Try AAAA
                    try {
                        await dns.resolve6(fullDomain);
                        found.push({
                            subdomain: fullDomain,
                            status: 'ACTIVE',
                            type: 'AAAA'
                        });
                    } catch (err2) {
                        // Not found
                    }
                }
            }
            
            return {
                success: true,
                domain: domain,
                scanned: subdomainsToCheck.length,
                found: found.length,
                subdomains: found,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    directoryScanner: async function(url, wordlist = null) {
        try {
            const commonDirs = [
                'admin', 'login', 'wp-admin', 'wp-login', 'administrator',
                'dashboard', 'control', 'cp', 'cpanel', 'backup',
                'config', 'configuration', 'setup', 'install',
                'phpmyadmin', 'mysql', 'sql', 'db', 'database',
                'images', 'img', 'assets', 'static', 'uploads',
                'download', 'files', 'docs', 'documents',
                'test', 'testing', 'dev', 'development',
                'api', 'rest', 'graphql', 'soap',
                '.git', '.svn', '.env', 'config.php', 'wp-config.php'
            ];
            
            const dirsToCheck = wordlist || commonDirs;
            const found = [];
            
            for (const dir of dirsToCheck) {
                const testUrl = url.endsWith('/') ? `${url}${dir}` : `${url}/${dir}`;
                
                try {
                    const response = await axios.get(testUrl, {
                        timeout: 3000,
                        validateStatus: function(status) {
                            return status >= 200 && status < 500;
                        }
                    });
                    
                    if (response.status !== 404) {
                        found.push({
                            url: testUrl,
                            status: response.status,
                            size: response.data.length,
                            directory: dir
                        });
                    }
                } catch (error) {
                    // Continue scanning
                }
            }
            
            return {
                success: true,
                baseUrl: url,
                scanned: dirsToCheck.length,
                found: found.length,
                directories: found,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    sslChecker: async function(domain) {
        try {
            const https = require('https');
            
            const options = {
                hostname: domain,
                port: 443,
                method: 'GET',
                rejectUnauthorized: false,
                agent: false
            };
            
            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    const cert = res.socket.getPeerCertificate();
                    
                    const result = {
                        success: true,
                        domain: domain,
                        valid: !res.socket.authorizationError,
                        error: res.socket.authorizationError,
                        certificate: {
                            subject: cert.subject,
                            issuer: cert.issuer,
                            validFrom: cert.valid_from,
                            validTo: cert.valid_to,
                            serialNumber: cert.serialNumber,
                            fingerprint: cert.fingerprint
                        },
                        daysRemaining: Math.floor((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24))
                    };
                    
                    resolve(result);
                });
                
                req.on('error', (error) => {
                    resolve({
                        success: false,
                        domain: domain,
                        error: error.message,
                        valid: false
                    });
                });
                
                req.end();
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    whoisLookup: async function(domain) {
        try {
            const response = await axios.get(`https://api.whois.vu/?domain=${domain}`);
            
            return {
                success: true,
                domain: domain,
                whois: response.data,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                domain: domain,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};
