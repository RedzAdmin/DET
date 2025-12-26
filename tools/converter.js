const fs = require('fs');
const path = require('path');

module.exports = {
    base64Encode: function(text) {
        try {
            const encoded = Buffer.from(text).toString('base64');
            return {
                success: true,
                input: text,
                encoded: encoded,
                length: encoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    base64Decode: function(encoded) {
        try {
            const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
            return {
                success: true,
                input: encoded,
                decoded: decoded,
                length: decoded.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    jsonFormatter: function(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const formatted = JSON.stringify(parsed, null, 2);
            
            return {
                success: true,
                original: jsonString,
                formatted: formatted,
                isValid: true,
                size: formatted.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                isValid: false
            };
        }
    },
    
    jsonMinify: function(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            const minified = JSON.stringify(parsed);
            
            return {
                success: true,
                originalSize: jsonString.length,
                minifiedSize: minified.length,
                saved: jsonString.length - minified.length,
                minified: minified
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    csvToJson: function(csvText) {
        try {
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const jsonArray = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = lines[i].split(',');
                const obj = {};
                
                headers.forEach((header, index) => {
                    obj[header] = values[index] ? values[index].trim() : '';
                });
                
                jsonArray.push(obj);
            }
            
            return {
                success: true,
                rows: jsonArray.length,
                headers: headers,
                json: jsonArray,
                formatted: JSON.stringify(jsonArray, null, 2)
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    jsonToCsv: function(jsonArray) {
        try {
            const array = typeof jsonArray === 'string' ? JSON.parse(jsonArray) : jsonArray;
            
            if (!Array.isArray(array) || array.length === 0) {
                throw new Error('Input must be a non-empty JSON array');
            }
            
            const headers = Object.keys(array[0]);
            let csv = headers.join(',') + '\n';
            
            array.forEach(item => {
                const row = headers.map(header => {
                    const value = item[header];
                    return typeof value === 'string' && value.includes(',') ? 
                        `"${value}"` : value;
                }).join(',');
                csv += row + '\n';
            });
            
            return {
                success: true,
                rows: array.length,
                headers: headers.length,
                csv: csv,
                size: csv.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },
    
    textCaseConverter: function(text, caseType = 'title') {
        try {
            let converted;
            
            switch (caseType) {
                case 'upper':
                    converted = text.toUpperCase();
                    break;
                case 'lower':
                    converted = text.toLowerCase();
                    break;
                case 'title':
                    converted = text.replace(/\w\S*/g, (txt) => {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                    break;
                case 'camel':
                    converted = text.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                        return index === 0 ? word.toLowerCase() : word.toUpperCase();
                    }).replace(/\s+/g, '');
                    break;
                case 'snake':
                    converted = text.toLowerCase().replace(/\s+/g, '_');
                    break;
                case 'kebab':
                    converted = text.toLowerCase().replace(/\s+/g, '-');
                    break;
                default:
                    converted = text;
            }
            
            return {
                success: true,
                original: text,
                converted: converted,
                caseType: caseType,
                length: converted.length
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
