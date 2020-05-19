const assert = require('assert').strict;
const path = require('path');

const rimraf = require('rimraf');
const tempDirectory = require('temp-dir');

const codeaugmentor_support = require('../index.js');

let buildDir = path.join(tempDirectory, "code-augmentor-support-nodejs");

/**
 * Main purpose of tests in this project is to test
 * error cases and the formatting of thrown exceptions.
 * More thorough testing of success case scenerios is dealt with outside this
 * project.
 */

describe('codeaugmentor_support', function() {
    it('should execute basic usage successfully', function(done) {
        // test that output dir can be recreated if absent.
        // do this only here, so subsequent tests verify that
        // existing output dir can be used successfully.
        rimraf.sync(buildDir);
        const config = {
            inputFile: path.join(__dirname, 'resources', 'aug_codes-00.json'),
            outputFile: path.join(buildDir, 'actual_gen_codes.json'),
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
    it('should fail due to unset ids', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'resources', 'aug_codes-00.json'),
            outputFile: path.join(buildDir, 'genCodes-js-ignore.json'),
            verbose: true
        };
        
        codeaugmentor_support.execute(config, evalerProducingUnsetIds, function(err) {
            done(err);
            printErrors(config);
            assert.equal(config.allErrors.length, 2);
            console.log(`Expected ${config.allErrors.length} error(s)`);
        });
    });
});

describe('codeaugmentor_support', function() {
    it('should fail due to duplicate ids', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'resources', 'aug_codes-01.json'),
            outputFile: path.join(buildDir, 'genCodes-js-ignore.json'),
            verbose: true
        };
        
        codeaugmentor_support.execute(config, evalerProducingDuplicateIds, function(err) {
            done(err);
            printErrors(config);
            assert.equal(config.allErrors.length, 1);
            console.log(`Expected ${config.allErrors.length} error(s)`);
        });
    });
});

describe('codeaugmentor_support', function() {
    it('should fail due to absence of production usage context', function(done) {
        const config = {
            inputFile: path.join(__dirname, 'resources', 'aug_codes-01.json'),
            outputFile: path.join(buildDir, 'genCodes-js-ignore.json'),
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

function evalerProducingUnsetIds(functionName, augCode, context) {
    let genCode = context.newGenCode();
    //genCode.id = augCode.id;
    genCode.contentParts.push(context.newContent(`Received: ${functionName}`));
    return [ genCode ];
}

function evalerProducingDuplicateIds(functionName, augCode, context) {
    let genCode = context.newGenCode();
    genCode.id = 1;
    genCode.contentParts.push(context.newContent(`Received: ${functionName}`));
    return [ genCode ];
}

function productionEvaler(functionName, augCode, context) {
    return eval(functionName + '(augCode, context)');
}