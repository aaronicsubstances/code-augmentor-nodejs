const code_aug_support = require('code-augmentor-support');
const CodeAugmentorFunctions = code_aug_support.CodeAugmentorFunctions;
const MyFunctions = require('./MyFunctions.js');
const OtherFunctions = require('./OtherFunctions.js');

const FUNCTION_NAME_REGEX = /^(((.*CodeAugmentorFunctions)|MyFunctions|OtherFunctions)\.)[a-zA-Z]\w*$/;
function callUserFunction(functionName, augCode, context) {
    // validate name.
    if (!FUNCTION_NAME_REGEX.test(functionName)) {
        throw new Error("Invalid/Unsupported function name: " + functionName);
    }

    // name is valid. make function call "dynamically".
    const result = eval(functionName + "(augCode, context)");
    return result;
}

const task = new code_aug_support.ProcessCodeTask();
task.inputFile = process.argv[2];
task.outputFile = process.argv[3];
task.verbose = !!process.argv[4];
task.execute(callUserFunction, err => {
    if (err) {
        throw err;
    }
    if (task.allErrors.length) {
        console.error(task.allErrors.length + " error(s) found.\n");
        for (errMsg of task.allErrors) {
            console.error(errMsg);
        }
        process.exit(1);
    }
});