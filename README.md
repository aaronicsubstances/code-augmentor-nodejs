# code-augmentor-support

This package enables the use of NodeJS as a scripting platform to generate code to serve the goals of Code Augmentor.

Code Augmentor is a set of libraries, plugins and tools for bringing code generation techniques to every programmer. For a more detailed explanation please visit the main Code Augmentor Github repository [here](https://github.com/aaronicsubstances/code-augmentor).

As far as this package and NodeJS developers are concerned, it is enough to think of Code Augmentor as (1) a command-line application, (2) which is configured to run an [Apache Ant](https://ant.apache.org) XML build file, (3) which in turn runs a NodeJS package or project written by a programmer, (4) with the aim of generating code for JavaScript or  another target programming language, (5) using this package as a dependency.


## Install

`npm install code-augmentor-support`

## Example

Below is a main script demonstrating how to set up the library for use with functions defined in two client modules Snippets.js and Worker.js.

It requires input and ouput file command-line arguments, and optional third argument to enable verbose logging.
```
node main.js test-augCodes.json actual.json
```

### main.js

```js
const code_aug_support = require('code-augmentor-support');
const CodeAugmentorFunctions = code_aug_support.CodeAugmentorFunctions;
const Snippets = require('./Snippets.js');
const Worker = require('./Worker.js');

const FUNCTION_NAME_REGEX = /^(((.*CodeAugmentorFunctions)|Snippets|Worker)\.)[a-zA-Z]\w*$/;
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

### expected.json (expected output file)

```json
{}
{"fileId":1,"generatedCodes":[{"id":1,"contentParts":[{"content":"private static final int serialVersionUID = 23L;","exactMatch":false}]}]}
{"fileId":2,"generatedCodes":[{"id":1,"contentParts":[{"content":"\" SELECT * FROM contacts \n\" +","exactMatch":true},{"content":"\" WHERE contacts.id = ? \"","exactMatch":true}]},{"id":2,"contentParts":[{"content":"private static final int serialVersionUID = 23L;","exactMatch":false}]}]}

```

## Usage

The library's functionality is contained in the method `execute` of the class `ProcessCodeTask` in the main module of this package. The `execute` method takes a function object used for evaluating code generation requests and producing generated code snippets.

Instances of `ProcessCodeTask` have the following properties:

   * `inputFile` - path to the code generation request. Must be the aug code file result of running the *code_aug_prepare* Ant task.
   * `outputFile` - path for writing out code generation response. Will be used as the gen code file input to the *code_aug_complete* Ant task.
   * `verbose` - boolean property which can be used with default verbose logging mechansim to enable printing of verbose mesages to standard output.
   * `allErrors` - array which contains any errors encountered during execution.
   
These methods can be overriden in a subclass:
   * `logVerbose`, `logInfo`, `logWarn` - methods which are called with a format string, *args, and **kwargs, when a verbose message, normal message, or warning message is issued. By default all normal and warning messages are printed to standard output, and verbose messages are ignored.

The `evalFunction` function argument of the `execute` method is called with 3 arguments. The first is name of a function to invoke in the current NodeJS scope, and the remaining two are an augmenting code object and a helper instance of the `ProcessCodeContext` class exported by main module of this package. These remaining two arguments are the arguments passed to the function to be invoked. 

The `evalFunction` is called with every augmenting code object encountered in the input file. It is expected to in turn call client-defined functions dynamically and receive from them a correponding generated code object to be written to the output file. As a convenience, it can return strings, content parts, and arrays of generated code objects.

The second optional argument to `execute` if given, must be a callback function what will be called with a single I/O error if reading from input file or writing to output file fails for some reason. If no error is encountered with reading/writing, it will be called with null. If it is not given or is null, then any error encountered during reading/writing will manifest as an exception to the client.


### Properties and Methods of `ProcessCodeContext` instances

   * *header* - JSON object resulting from parsing first line of input file.
   * *globalScope* - an object/map/dictionary provided for use by clients which remains throughout parsing of entire input file.
   * *fileScope* - an object/map/dictionary provided for use by clients which is reset at the start of processing every line of input file.
   * *fileAugCodes* - JSON object resulting of parsing current line of input file other than first line.
   * *augCodeIndex* - index of `augCode` parameter in `fileAugCodes.augmentingCodes` array
   * *newGenCode()* - convenience function available to clients for creating a generated code object with empty `contentParts` array property.
   * *newContent(content, exactMatch=false)* - convenience function available to clients for creating a new content part object with properties set with arguments supplied to the function.
   * *newSkipGenCode()* - convenience method to create a generated code object indicating skipping of aug code section. Will have null content parts.
   * *getScopeVar(name)* - gets a variable from fileScope array with given name, or from globalScope array if not found in fileScope.

### Reserved 'CodeAugmentor' Prefix

CodeAugmentor supplies utility functions and variables by reserving the **CodeAugmentor** prefix. As such scripts should avoid naming aug code processing functions and variables in fileScope/globalScope with that prefix.

The following variables are provided by default in context globalScope:

   * *codeAugmentor_indent* - set with value of four spaces.

The following functions are provided by **CodeAugmentorFunctions** module exported by main module of this package for use to process aug codes:

   * *CodeAugmentorFunctions.setScopeVar* - requires each embedded data in augmenting code section to be a JSON object. For each such object, every property of the object is used to set a variable in context fileScope whose value is the value of the property in the JSON object.
   * *CodeAugmentorFunctions.setGlobalScopeVar* - same as setScopeVar, but rather sets variables in context globalScope.

## Further Information

For more information on the structure of augmenting code object, generated code object and other considerations, refer to [wiki](https://github.com/aaronicsubstances/code-augmentor/wiki/Documentation-for-Code-Generator-Scripts) in the main Code Augmentor repository.

## Building and Testing Locally

   * Clone repository locally
   * Install project dependencies with `npm install`
   * With all dependencies present locally, test project with `npm test`
