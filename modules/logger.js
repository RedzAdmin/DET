const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDir();
    }
    
    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    
    log(type, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };
        
        // Console output
        console.log(`[${type.toUpperCase()}] ${timestamp}: ${message}`);
        
        // File logging
        const logFile = path.join(this.logDir, `${type}.log`);
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        
        // Combined log
        const combinedFile = path.join(this.logDir, 'combined.log');
        fs.appendFileSync(combinedFile, `[${timestamp}] ${type}: ${message}\n`);
    }
    
    info(message, data = {}) {
        this.log('info', message, data);
    }
    
    error(message, data = {}) {
        this.log('error', message, data);
    }
    
    warn(message, data = {}) {
        this.log('warn', message, data);
    }
    
    debug(message, data = {}) {
        this.log('debug', message, data);
    }
    
    userAction(userId, action, details = {}) {
        this.log('user', `User ${userId}: ${action}`, { userId, ...details });
    }
    
    adminAction(adminId, action, details = {}) {
        this.log('admin', `Admin ${adminId}: ${action}`, { adminId, ...details });
    }
    
    command(userId, command, success = true) {
        this.log('command', `User ${userId} executed: ${command}`, { userId, command, success });
    }
    
    getLogs(type, limit = 100) {
        try {
            const logFile = path.join(this.logDir, `${type}.log`);
            
            if (!fs.existsSync(logFile)) {
                return [];
            }
            
            const content = fs.readFileSync(logFile, 'utf-8');
            const lines = content.trim().split('\n');
            
            return lines
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return { raw: line };
                    }
                })
                .reverse();
        } catch (error) {
            this.error('Failed to read logs', { error: error.message });
            return [];
        }
    }
    
    clearLogs(type = null) {
        try {
            if (type) {
                const logFile = path.join(this.logDir, `${type}.log`);
                if (fs.existsSync(logFile)) {
                    fs.writeFileSync(logFile, '');
                }
            } else {
                const files = fs.readdirSync(this.logDir);
                files.forEach(file => {
                    if (file.endsWith('.log')) {
                        fs.writeFileSync(path.join(this.logDir, file), '');
                    }
                });
            }
            return true;
        } catch (error) {
            this.error('Failed to clear logs', { error: error.message });
            return false;
        }
    }
}

module.exports = new Logger();
