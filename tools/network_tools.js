const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const cheerio = require('cheerio');

module.exports = {
    portScanner: async function(host, ports = [80, 443, 22, 21, 25, 3306, 8080, 3000]) {
        try {
            const results = [];
            
            for (const port of ports) {
                const socket = new net.Socket();
                
                const result = await new Promise((resolve) => {
                    socket.setTimeout(1500);
                    
                    socket.on('connect', () => {
                        results.push({ port, status: 'OPEN', service: getServiceName(port) });
                        socket.destroy();
                        resolve(true);
                    });
                    
                    socket.on('timeout', () => {
                        results.push({ port, status: 'TIMEOUT', service: getServiceName(port) });
                        socket.destroy();
                        resolve(false);
                    });
                    
                    socket.on('error', () => {
                        results.push({ port, status: 'CLOSED', service: getServiceName(port) });
                        socket.destroy();
                        resolve(false);
                    });
                    
                    socket.connect(port, host);
                });
            }
            
            const openPorts = results.filter(r => r.status === 'OPEN');
            
            return {
                success: true,
                host: host,
                scannedPorts: ports.length,
                openPorts: openPorts.length,
                results: results,
                open: openPorts
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    dnsLookup: async function(domain, recordTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']) {
        try {
            const results = {};
            
            for (const type of recordTypes) {
                try {
                    switch (type) {
                        case 'A':
                            results.A = await dns.resolve4(domain);
                            break;
                        case 'AAAA':
                            results.AAAA = await dns.resolve6(domain);
                            break;
                        case 'MX':
                            results.MX = await dns.resolveMx(domain);
                            break;
                        case 'TXT':
                            results.TXT = await dns.resolveTxt(domain);
                            break;
                        case 'NS':
                            results.NS = await dns.resolveNs(domain);
                            break;
                        case 'CNAME':
                            results.CNAME = await dns.resolveCname(domain);
                            break;
                        case 'SOA':
                            results.SOA = await dns.resolveSoa(domain);
                            break;
                    }
                } catch (err) {
                    results[type] = `Error: ${err.message}`;
                }
            }
            
            return {
                success: true,
                domain: domain,
                records: results,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    websiteScanner: async function(url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'DarkEmpireTechBot/1.0'
                }
            });
            
            const $ = cheerio.load(response.data);
            const headers = response.headers;
            
            // Extract information
            const title = $('title').text();
            const metaDescription = $('meta[name="description"]').attr('content');
            const metaKeywords = $('meta[name="keywords"]').attr('content');
            const links = $('a').length;
            const images = $('img').length;
            const scripts = $('script').length;
            const forms = $('form').length;
            
            // Security headers check
            const securityHeaders = {
                'X-Frame-Options': headers['x-frame-options'] || 'Missing',
                'X-Content-Type-Options': headers['x-content-type-options'] || 'Missing',
                'X-XSS-Protection': headers['x-xss-protection'] || 'Missing',
                'Content-Security-Policy': headers['content-security-policy'] || 'Missing',
                'Strict-Transport-Security': headers['strict-transport-security'] || 'Missing'
            };
            
            return {
                success: true,
                url: url,
                status: response.status,
                headers: headers,
                security: securityHeaders,
                info: {
                    title: title,
                    description: metaDescription,
                    keywords: metaKeywords,
                    links: links,
                    images: images,
                    scripts: scripts,
                    forms: forms,
                    size: response.data.length,
                    loadTime: response.headers['request-duration'] || 'N/A'
                },
                technologies: detectTechnologies(headers, response.data)
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    ping: async function(host) {
        try {
            const start = Date.now();
            const response = await axios.get(`http://${host}`, { timeout: 5000 });
            const end = Date.now();
            
            return {
                success: true,
                host: host,
                status: response.status,
                ping: end - start,
                size: response.data.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                host: host,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};

function getServiceName(port) {
    const services = {
        20: 'FTP Data',
        21: 'FTP Control',
        22: 'SSH',
        23: 'Telnet',
        25: 'SMTP',
        53: 'DNS',
        80: 'HTTP',
        110: 'POP3',
        143: 'IMAP',
        443: 'HTTPS',
        3306: 'MySQL',
        3389: 'RDP',
        5432: 'PostgreSQL',
        8080: 'HTTP-ALT',
        8443: 'HTTPS-ALT'
    };
    return services[port] || 'Unknown';
}

function detectTechnologies(headers, html) {
    const tech = [];
    
    // Detect from headers
    if (headers['server']) tech.push(`Server: ${headers['server']}`);
    if (headers['x-powered-by']) tech.push(`Powered by: ${headers['x-powered-by']}`);
    
    // Detect from HTML
    if (html.includes('wp-content')) tech.push('WordPress');
    if (html.includes('Joomla')) tech.push('Joomla');
    if (html.includes('Drupal')) tech.push('Drupal');
    if (html.includes('react')) tech.push('React');
    if (html.includes('angular')) tech.push('Angular');
    if (html.includes('vue')) tech.push('Vue.js');
    if (html.includes('jquery')) tech.push('jQuery');
    if (html.includes('bootstrap')) tech.push('Bootstrap');
    
    return tech.length > 0 ? tech : ['Unknown or Custom'];
}
