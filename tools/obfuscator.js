const JSConfuser = require("js-confuser");
const fs = require('fs');
const path = require('path');

const optionsObf6 = {
    target: "node",
    preset: "high",
    compact: true,
    minify: true,
    flatten: true,

    identifierGenerator: function() {
        const originalString = 
            "素晴座素晴難CODEBREAKER素晴座素晴難" + 
            "素晴座素晴難CODEBREAKER素晴座素晴難";
        
        function removeUnwantedChars(input) {
            return input.replace(
                /[^a-zA-Z座Nandokuka素Muzukashī素晴]/g, ''
            );
        }

        function randomString(length) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            const charactersLength = characters.length;

            for (let i = 0; i < length; i++) {
                result += characters.charAt(
                    Math.floor(Math.random() * charactersLength)
                );
            }
            return result;
        }

        return removeUnwantedChars(originalString) + randomString(2);
    },

    renameVariables: true,
    renameGlobals: true,
    stringEncoding: true,
    stringSplitting: 0.0,
    stringConcealing: true,
    stringCompression: true,
    duplicateLiteralsRemoval: 1.0,

    shuffle: {
        hash: 0.0,
        true: 0.0
    },

    stack: true,
    controlFlowFlattening: 1.0,
    opaquePredicates: 0.9,
    deadCode: 0.0,
    dispatcher: true,
    rgf: false,
    calculator: true,
    hexadecimalNumbers: true,
    movedDeclarations: true,
    objectExtraction: true,
    globalConcealing: true
};

const standardOptions = {
    target: "node",
    calculator: true,
    compact: true,
    hexadecimalNumbers: true,
    controlFlowFlattening: 0.5,
    deadCode: 0.25,
    dispatcher: true,
    duplicateLiteralsRemoval: 0.75,
    flatten: true,
    globalConcealing: true,
    minify: true,
    movedDeclarations: true,
    objectExtraction: true,
    opaquePredicates: 0.75,
    renameVariables: true,
    renameGlobals: true,
    shuffle: true,
    stringConcealing: true,
    stringCompression: true,
    stringEncoding: true,
    stringSplitting: 0.75,
    preserveFunctionLength: true,
    identifierGenerator: function () {
        return "DARK_EMPIRE_" + Math.random().toString(36).substring(7);
    },
};

module.exports = {
    obfuscateCode: async (code, optionsType = 'high') => {
        try {
            const options = optionsType === 'high' ? optionsObf6 : standardOptions;
            const obfuscatedCode = await JSConfuser.obfuscate(code, options);
            
            return {
                success: true,
                code: obfuscatedCode,
                length: obfuscatedCode.length,
                type: optionsType === 'high' ? 'High Security' : 'Standard'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    obfuscateFile: async (fileBuffer, optionsType = 'high') => {
        try {
            const code = fileBuffer.toString('utf-8');
            const options = optionsType === 'high' ? optionsObf6 : standardOptions;
            const obfuscatedCode = await JSConfuser.obfuscate(code, options);
            
            const tempPath = path.join(__dirname, '../assets/temp', `obfuscated_${Date.now()}.js`);
            fs.writeFileSync(tempPath, obfuscatedCode);
            
            return {
                success: true,
                filePath: tempPath,
                fileName: `encrypted_by_darkempire.js`,
                length: obfuscatedCode.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
};
