const assert = require('assert').strict;

const code_aug_support = require('code-augmentor-support');
const MyFunctions = require('./MyFunctions.js');
const OtherFunctions = require('./OtherFunctions.js');

const FUNCTION_NAME_REGEX = /^((MyFunctions|OtherFunctions)\.)[a-zA-Z]\w*$/;
function callUserFunction(functionName, augCode, context) {
    // validate name.
    if (!FUNCTION_NAME_REGEX.test(functionName)) {
        throw new Error("Invalid/Unsupported function name: " + functionName);
    }

    // name is valid. make function call "dynamically".
    const result = eval(functionName + "(augCode, context)");
    return result;
}

const config = {
    inputFile: process.argv[2],
    outputFile: process.argv[3],
    verbose: !!process.argv[4]
};
assert.ok(config.inputFile);
assert.ok(config.outputFile);
code_aug_support.execute(config, callUserFunction, err => {
    if (err) {
        throw err;
    }
    if (config.allErrors.length) {
        console.error(config.allErrors.length + " error(s) found.\n");
        for (errMsg of config.allErrors) {
            console.error(errMsg);
        }
        process.exit(1);
    }
});