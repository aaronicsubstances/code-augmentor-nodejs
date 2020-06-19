const assert = require('assert').strict;
const fs = require('fs');
const readline = require('readline');
var endOfLine = require('os').EOL;
const path = require('path');

const ProcessCodeContext = require('./ProcessCodeContext');

// class constructor
function ProcessCodeTask() {
    this.verbose = false;
};

ProcessCodeTask.prototype.logVerbose = function(msg) {
    if (this.verbose) {
        console.log("[VERBOSE] " + msg);
    }
};

ProcessCodeTask.prototype.logInfo = function(msg) {
    console.log("[INFO] " + msg);
};

ProcessCodeTask.prototype.logWarn = function(msg) {
    console.log("[WARN] " + msg);
};

ProcessCodeTask.prototype.execute = function(evalFunction, cb=null) {
    // validate
    assert.ok(this.inputFile, "inputFile property is not set");
    assert.ok(this.outputFile, "outputFile property is not set");
    assert.ok(evalFunction);

    this.allErrors = [];
        
    // ensure dir exists for outputFile.
    const outputDir = path.dirname(this.outputFile)
    if (outputDir) {
        fs.mkdirSync(outputDir, {
            recursive: true // also ensures no error is thrown if dir already exists
        });
    }

    const context = new ProcessCodeContext();

    // begin serialize by writing header to output 
    const codeGenResponse = fs.createWriteStream(this.outputFile);
    codeGenResponse.write(JSON.stringify({}, '') + endOfLine);

    // begin reading input file.
    try {
        let headerSeen = false;
        const rl = readline.createInterface({
            input: fs.createReadStream(this.inputFile),
            crlfDelay: Infinity
        });
        rl.on('line', (line) => {
            // begin deserialize by reading header from input
            if (!headerSeen) {
                context.header = JSON.parse(line);
                headerSeen = true;
                return;
            }
            
            let fileAugCodes = JSON.parse(line);

            // set up context.
            context.srcFile = path.join(fileAugCodes.dir,
                fileAugCodes.relativePath);
            context.fileAugCodes = fileAugCodes;
            context.fileScope = {};
            this.logVerbose(`Processing ${context.srcFile}`);

            // fetch arguments, and parse any json argument found.
            for (augCode of fileAugCodes.augmentingCodes) {
                augCode.processed = false;
                augCode.args = [];
                for (block of augCode.blocks) {
                    if (block.jsonify) {
                        const parsedArg = JSON.parse(block.content);
                        augCode.args.push(parsedArg);
                    }
                    else if (block.stringify) {
                        augCode.args.push(block.content);
                    }
                }
            }
            
            // now begin aug code processing.
            const fileGenCodes = { 
                fileId: fileAugCodes.fileId,
                generatedCodes: []
            };
            const beginErrorCount = this.allErrors.length;
            for (let i = 0; i < fileAugCodes.augmentingCodes.length; i++) {
                const augCode = fileAugCodes.augmentingCodes[i];
                if (augCode.processed) {
                    continue;
                }

                context.augCodeIndex = i;
                const functionName = retrieveFunctionName(augCode);
                const genCodes = this.processAugCode(evalFunction, functionName,
                    augCode, context);
                for (genCode of genCodes) {
                    fileGenCodes.generatedCodes.push(genCode);
                }
            }
                        
            validateGeneratedCodeIds(fileGenCodes.generatedCodes, context,
                this.allErrors);
            
            if (this.allErrors.length > beginErrorCount) {
                this.logWarn((this.allErrors.length - beginErrorCount) +
                    " error(s) encountered in " + context.srcFile);
            }            

            if (this.allErrors.length == 0) {
                codeGenResponse.write(JSON.stringify(fileGenCodes, '') + endOfLine);
            }
            this.logInfo("Done processing " + context.srcFile);
        }).on('close', () => {
            codeGenResponse.end();
            cb && cb();
        });
    }
    catch (err) {
        if (cb) {
            cb(err);
        }
        else {
            throw err;
        }
    }
};

function retrieveFunctionName(augCode) {
    let functionName = augCode.blocks[0].content.trim();
    return functionName;
}

ProcessCodeTask.prototype.processAugCode = function(evalFunction, functionName, augCode, context) {
    try {
        let result = evalFunction(functionName, augCode, context);
        if (result === null || typeof result === 'undefined') {
            return [ convertGenCodeItem(null) ];
        }
        let converted = [];
        if (Array.isArray(result)) {
            for (item of result) {
                let genCode = convertGenCodeItem(item);
                converted.push(genCode);
                // try and mark corresponding aug code as processed.
                if (genCode.id > 0) {
                    let correspondingAugCodes = 
                        context.fileAugCodes.augmentingCodes
                            .filter(x => x.id == genCode.id);
                    if (correspondingAugCodes.length > 0) {
                        correspondingAugCodes[0].processed = true;
                    }
                }
            }
        }
        else {
            let genCode = convertGenCodeItem(result);
            genCode.id = augCode.id;
            converted.push(genCode);
        }
        return converted;
    }
    catch (excObj) {
        createException(context, null, excObj, this.allErrors);
        return [];
    }
}

function convertGenCodeItem(item) {
    if (item === null || typeof item === 'undefined') {
        return { id: 0 };
    }
    if (typeof item.skipped !== 'undefined' || typeof item.contentParts !== 'undefined') {
        // assume it is GeneratedCode instance and ensure
        // existence of id field.
        if (!item.id) {
            item.id = 0;
        }
        return item;
    }
    else if (typeof item.content !== 'undefined') {
        // assume it is ContentPart instance
        return {
            id: 0,
            contentParts: [ item ]
        };
    }
    else {
        // assume string or stringify it.
        return {
            id: 0,
            contentParts: [
                {
                    content: `${item}`,
                    exactMatch: false
                }
            ]
        };
    }
}

function validateGeneratedCodeIds(fileGenCodeList, context, allErrors) {
    let ids = fileGenCodeList.map(x => x.id);
    // Interpret use of -1 or negatives as intentional and skip
    // validating negative ids.
    if (ids.filter(x => !x).length > 0) {
        createException(context, 'At least one generated code id was not set. Found: ' + ids,
            null, allErrors);
    }
    else {
        let duplicateIds = ids.filter(x => x > 0 && ids.filter(y => x == y).length > 1);
        if (duplicateIds.length > 0) {
            createException(context, 'Valid generated code ids must be unique, but found duplicates: ' + ids,
                null, allErrors);
        }
    }
}

function createException(context, message, evalEx, allErrors) {
    let lineMessage = '';
    let stackTrace = '';
    if (evalEx) {
        let augCode = context.fileAugCodes.augmentingCodes[context.augCodeIndex];
        lineMessage = ` at line ${augCode.lineNumber}`;
        message = augCode.blocks[0].content + `: ${evalEx.name}: ${evalEx.message}`;        
        stackTrace = '\n' + evalEx.stack;
    }
    let exception = `in ${context.srcFile}${lineMessage}: ${message}${stackTrace}`;
    allErrors.push(exception);
}

exports.ProcessCodeTask = ProcessCodeTask;