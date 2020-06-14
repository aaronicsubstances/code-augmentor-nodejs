# code-augmentor-support

This package enables the use of NodeJS as a scripting platform to generate code to serve the goals of Code Augmentor.

Code Augmentor is a set of libraries, plugins and tools for bringing code generation techniques to every programmer. For a more detailed explanation please visit the main Code Augmentor Github repository [here](https://github.com/aaronicsubstances/code-augmentor).

As far as this package and NodeJS developers are concerned, it is enough to think of Code Augmentor as (1) a command-line application, (2) which is configured to run an [Apache Ant](https://ant.apache.org) XML build file, (3) which in turn runs a NodeJS package or project written by a programmer, (4) with the aim of generating code for JavaScript or  another target programming language, (5) using this package as a dependency.


## Install

`npm install code-augmentor-support`

## Example

Below is a main script demonstrating how to set up the library for use with functions defined in two client modules Snippets.js and Worker.js.

It requires input and ouput file command-line arguments, and optional third argument to enable verbose logging.

### main.js

```js
const assert = require('assert').strict;

const code_aug_support = require('code-augmentor-support');
const Snippets = require('./Snippets.js');
const Worker = require('./Worker.js');

const FUNCTION_NAME_REGEX = /^((Snippets|Worker)\.)[a-zA-Z]\w*$/;
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
```

### Snippets.js

```js
exports.generateSerialVersionUID = function(augCode, context) {
    return "private static final int serialVersionUID = 23L;";
}
```

### Worker.js

```js
exports.stringify = function(augCode, context) {
    const g = context.newGenCode()
    for (let i = 0; i < augCode.args.length; i++) {
        let s = '"' + augCode.args[i];
        if (i < augCode.args.length - 1) {
            s += augCode.lineSeparator + '" +';
        }
        else {
            s += '"';
        }
        g.contentParts.push(context.newContent(s, true));
    }
    return g;
}
```

### test-augCodes.json (sample input file)

```json
{ "genCodeStartDirective": "//:GS:", "genCodeEndDirective": "//:GE:", "embeddedStringDirective": "//:STR:", "embeddedJsonDirective": "//:JSON:", "skipCodeStartDirective": "//:SS:", "skipCodeEndDirective": "//:SE:", "augCodeDirective": "//:AUG_CODE:", "inlineGenCodeDirective": "//:GG:", "nestedLevelStartMarker": "[", "nestedLevelEndMarker": "]" }
{"fileId":1,"dir":"src","relativePath":"A1.py","augmentingCodes":[{"id":1,"directiveMarker":"//:AUG_CODE:","indent":"","lineNumber":1,"lineSeparator":"\n","nestedLevelNumber":0,"hasNestedLevelStartMarker":false,"hasNestedLevelEndMarker":false,"blocks":[{"stringify":false,"jsonify":false,"content":" Snippets.generateSerialVersionUID "}]}]}
{"fileId":2,"dir":"src","relativePath":"B2.py","augmentingCodes":[{"id":1,"directiveMarker":"//:AUG_CODE:","indent":"","lineNumber":1,"lineSeparator":"\n","nestedLevelNumber":0,"hasNestedLevelStartMarker":false,"hasNestedLevelEndMarker":false,"blocks":[{"stringify":false,"jsonify":false,"content":" Worker.stringify "},{"stringify":true,"jsonify":false,"content":" SELECT * FROM contacts "},{"stringify":true,"jsonify":false,"content":" WHERE contacts.id = ? "}]},{"id":2,"directiveMarker":"//:AUG_CODE:","indent":"","lineNumber":19,"lineSeparator":"\n","nestedLevelNumber":0,"hasNestedLevelStartMarker":false,"hasNestedLevelEndMarker":false,"blocks":[{"stringify":false,"jsonify":false,"content":" Snippets.generateSerialVersionUID "},{"stringify":false,"jsonify":true,"content":"{ \"name\": \"expired\", \"type\": \"boolean\" } "}]}]}

```

### test-genCodes.json (expected output file)

```json
{}
{"fileId":1,"generatedCodes":[{"id":1,"contentParts":[{"content":"private static final int serialVersionUID = 23L;","exactMatch":false}]}]}
{"fileId":2,"generatedCodes":[{"id":1,"contentParts":[{"content":"\" SELECT * FROM contacts \n\" +","exactMatch":true},{"content":"\" WHERE contacts.id = ? \"","exactMatch":true}]},{"id":2,"contentParts":[{"content":"private static final int serialVersionUID = 23L;","exactMatch":false}]}]}

```

## Usage

The library exposes a single function `execute` that has 3 parameters, with the first 2 being required. The first is an object for configuring the function's operation, the second is a function for evaluating code generation requests and producing generated code snippets, the third is optional callback to indicate end of the asynchronous operation of `execute` as well as any I/O error encountered.

The first `config` object argument must have the following properties:

   * `inputFile` - path to the code generation request. Must be the aug code file result of running the *code_aug_prepare* Ant task.
   * `outputFile` - path for writing out code generation response. Will be used as the gen code file input to the *code_aug_complete* Ant task.
   
Optionally, these properties can be supplied:
   * `logVerbose`, `logInfo`, `logWarn` - functions which are called with a single message argument when a verbose message, normal message, or warning message is issued. By default all normal and warning messages are printed to standard output, and verbose messages are ignored.
   * `verbose` - optional boolean property which can be used with default verbose logging mechansim to enable printing of verbose mesages to standard output. This property is ignored if a custom `logVerbose` function is supplied.

Lastly, an `allErrors` property is set on the config object as an array to return any expected non I/O error encountered to the client.

The second `evalFunction` function argument is called with 3 arguments. The first is name of a function to invoke in the current NodeJS scope, and the remaining two are an augmenting code object and a helper `context` object. These remaining two arguments are the arguments passed to the function to be invoked. 

The `evalFunction` is called with every augmenting code object encountered in the input file. It is expected to in turn call client-defined functions dynamically and receive from them a correponding generated code object to be written to the output file. As a convenience, it can return strings, content parts, and arrays of generated code objects.

The third optional argument to `execute` if given, must be a callback function what will be called with a single I/O error if reading from input file or writing to output file fails for some reason. If no error is encountered with reading/writing, it will be called with null. If it is not given or is null, then any error encountered during reading/writing will manifest as an exception to the client.


### Properties and Methods of helper context object

   * header - JSON object resulting from parsing first line of input file.
   * globalScope - an object/map/dictionary provided for use by clients which remains throughout parsing of entire input file.
   * fileScope - an object/map/dictionary provided for use by clients which is reset at the start of processing every line of input file.
   * fileAugCodes - JSON object resulting of parsing current line of input file other than first line.
   * augCodeIndex - index of `augCode` parameter in `fileAugCodes.augmentingCodes` array
   * newGenCode() - convenience function available to clients for creating a generated code object with empty `contentParts` array property.
   * newContent(content, exactMatch=false) - convenience function available to clients for creating a new content part object with properties set with arguments supplied to the function.

## Further Information

For more information on the structure of augmenting code object, generated code object and other considerations, refer to [wiki](https://github.com/aaronicsubstances/code-augmentor/wiki/Documentation-for-Code-Generator-Scripts) in the main Code Augmentor repository.

## Building and Testing Locally

   * Clone repository locally
   * Install project dependencies with `npm install`
   * With all dependencies present locally, test project with `npm test`
