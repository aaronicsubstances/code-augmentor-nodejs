const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');

const rimraf = require('rimraf');
const tempDirectory = require('temp-dir');

const codeaugmentor_support = require('../index.js');

let buildDir = path.join(tempDirectory, "code-augmentor-support-nodejs");

describe('codeaugmentor_support', function() {
    it('should execute basic usage successfully', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'basic_usage_aug_codes.json'),
            outputFile: path.join(buildDir, 'basic_usage_gen_codes-00.json'),
            verbose: true
        };
        
        codeaugmentor_support.execute(config, evaler, function(err) {
            done(err);
            printErrors(config);
            assert.ok(!config.allErrors.length);
        });
    });
});

describe('codeaugmentor_support', function() {
    it('should execute usage with array result successfully', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'basic_usage_aug_codes.json'),
            outputFile: path.join(buildDir, 'basic_usage_gen_codes-01.json'),
            verbose: true
        };
        
        codeaugmentor_support.execute(config, evalerWithArrayReturnResult, function(err) {
            done(err);
            printErrors(config);
            assert.ok(!config.allErrors.length);
        });
    });
});

describe('codeaugmentor_support', function() {
    it('should execute basic eval exception successfully', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'basic_usage_aug_codes.json'),
            outputFile: path.join(buildDir, 'basic_usage_gen_codes-02.json'),
            verbose: true
        };
        
        codeaugmentor_support.execute(config, productionEvaler, function(err) {
            done(err);
            printErrors(config);
            assert.equal(config.allErrors.length, 2);
            console.log(`Expected ${config.allErrors.length} error(s)`);
        });
    });
});

function printErrors(config) {
    for (ex of config.allErrors) {
        console.log(ex);
        //console.error(ex);
    }
}

function evaler(functionName, augCode, context) {
    return `Received: ${functionName}: ${augCode}, ${context}`;
}

function evalerWithArrayReturnResult(functionName, augCode, context) {
    let genCode = context.newGenCode();
    genCode.id = augCode.id;
    genCode.contentParts.push(context.newContent(`Received: ${functionName}`));
    return [ genCode ];
}

function productionEvaler(functionName, augCode, context) {
    return eval(functionName + '(augCode, context)');
}