const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');

const rimraf = require('rimraf');
const tempDirectory = require('temp-dir');

const code_augmentor_support = require('../src/index');

// pre-import for use by scripts.
const CodeAugmentorFunctions = require('../src/CodeAugmentorFunctions');

let buildDir = path.join(tempDirectory, "code-augmentor-support-nodejs");

/**
 * Main purpose of tests in this project is to test
 * error cases and the formatting of thrown exceptions.
 * More thorough testing of success case scenerios is dealt with outside this
 * project.
 */

describe('code_augmentor_support', function() {
    it('should execute basic usage successfully', function(done) {
        // test that output dir can be recreated if absent.
        // do this only here, so subsequent tests verify that
        // existing output dir can be used successfully.
        rimraf.sync(buildDir);
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-00.json');
        task.outputFile = path.join(buildDir, 'actual_gen_codes.json');
        
        task.execute(evaler, function(err) {
            done(err);
            printErrors(task);
            assert.ok(!task.allErrors.length);
        });
    });
});

describe('code_augmentor_support', function() {
    it('should fail due to unset ids', function(done) {
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-00.json');
        task.outputFile = path.join(buildDir, 'genCodes-js-ignore.json');
        task.verbose = true;
        
        task.execute(evalerProducingUnsetIds, function(err) {
            done(err);
            printErrors(task);
            assert.equal(task.allErrors.length, 2);
            console.log(`Expected ${task.allErrors.length} error(s)`);
        });
    });
});

describe('code_augmentor_support', function() {
    it('should fail due to duplicate ids', function(done) {
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-01.json');
        task.outputFile = path.join(buildDir, 'genCodes-js-ignore.json');
        task.verbose = true;
        
        task.execute(evalerProducingDuplicateIds, function(err) {
            done(err);
            printErrors(task);
            assert.equal(task.allErrors.length, 1);
            console.log(`Expected ${task.allErrors.length} error(s)`);
        });
    });
});

describe('code_augmentor_support', function() {
    it('should fail due to absence of production usage context', function(done) {
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-01.json');
        task.outputFile = path.join(buildDir, 'genCodes-js-ignore.json');
        task.verbose = true;
        
        task.execute(productionEvaler, function(err) {
            done(err);
            printErrors(task);
            assert.equal(task.allErrors.length, 2);
            console.log(`Expected ${task.allErrors.length} error(s)`);
        });
    });
});

describe('code_augmentor_support', function() {
    it('should fail due to missing evaler return value', function(done) {
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-01.json');
        task.outputFile = path.join(buildDir, 'genCodes-js-ignore.json');
        task.verbose = true;
        
        task.execute(function(f, a, c){}, function(err) {
            done(err);
            printErrors(task);
            assert.equal(task.allErrors.length, 1);
            console.log(`Expected ${task.allErrors.length} error(s)`);
        });
    });
});

describe('code_augmentor_support', function() {
    it('should pass testing of scope accesses and gen code skipping', function(done) {
        const task = new code_augmentor_support.ProcessCodeTask();
        task.inputFile = path.join(__dirname, 'resources', 'aug_codes-02.json');
        task.outputFile = path.join(buildDir, 'genCodes-js-ignore.json');
        
        task.execute(contextScopeMethodAccessEvaler, function(err) {
            if (err) {
                done(err);
                return;
            }
            printErrors(task);
            assert.ok(!task.allErrors.length);
            fs.readFile(task.outputFile, 'utf8', function(err, data) {
                done(err)
                assert.equal(data.replace(/\r\n|\n|\r/g, "\n"), '{}\n' +
                    '{"fileId":1,"generatedCodes":[' +
                    '{"skipped":true,"id":1},' +
                    '{"skipped":true,"id":2},' +
                    '{"skipped":true,"id":3}]}\n'
                );
            });
        });
    });
});

function printErrors(task) {
    for (ex of task.allErrors) {
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

function contextScopeMethodAccessEvaler(f, a, c) {
    if (f != "\"testUseOfGetScopeVar\"") {
        return productionEvaler(f, a, c);
    }
    assert.equal(c.getScopeVar("address"), "NewTown");
    assert.equal(c.getScopeVar("serviceType"), "ICT");
    assert.equal(c.getScopeVar("allServiceTypes"), "ICT,Agric");
    assert.equal(c.globalScope["address"], "OldTown");
    assert.equal(c.getScopeVar("codeAugmentor_indent"), "    ");
    return c.newSkipGenCode();
}