// Class constructor.
function ProcessCodeContext() {
    this.globalScope = {
        'codeAugmentor_indent': '    '
    };
}

ProcessCodeContext.prototype.newGenCode = function() {
    return {
        id: 0,
        contentParts: []   
    }
};

ProcessCodeContext.prototype.newContent = function(content, exactMatch=false) {
    return {
        content, exactMatch
    };
};

ProcessCodeContext.prototype.newSkipGenCode = function() {
    return {
        skipped: true
    };
}

ProcessCodeContext.prototype.getScopeVar = function(name) {
    if (name in this.fileScope) {
        return this.fileScope[name];
    }
    return this.globalScope[name];
};

module.exports = ProcessCodeContext;