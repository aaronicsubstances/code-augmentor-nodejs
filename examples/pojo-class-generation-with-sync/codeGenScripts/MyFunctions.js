const path = require('path');

const OtherFunctions = require('./OtherFunctions');

exports.theClassProps = function(augCode, context) {
    context.fileScope.theClassProps = augCode.args[0]
    context.fileScope.theClassName = path.basename(context.fileAugCodes.relativePath, '.java')
    let out = ''
    for (propSpec of context.fileScope.theClassProps) {
        out += `private ${propSpec.type} ${propSpec.name};`
        out += augCode.lineSeparator
    }
    return out
}

exports.generateClassProps = function(augCode, context) {
    let out = ''
    const defaultIndent = context.getScopeVar('codeAugmentor_indent');
    for (propSpec of context.fileScope.theClassProps) {
        const capitalized = OtherFunctions.capitalize(propSpec.name);
        out += `public ${propSpec.type} get${capitalized}() {`
        out += augCode.lineSeparator
        out += `${defaultIndent}return ${propSpec.name};`
        out += augCode.lineSeparator
        out += `}${augCode.lineSeparator}`
        out += `public void set${capitalized}(${propSpec.type} ${propSpec.name}) {`
        out += augCode.lineSeparator
        out += `${defaultIndent}this.${propSpec.name} = ${propSpec.name};`
        out += augCode.lineSeparator
        out += `}${augCode.lineSeparator}`
        out += augCode.lineSeparator
    }
    return out
}

exports.generateEqualsAndHashCode = function(augCode, context) {
    // don't override if empty.
    if (context.fileScope.theClassProps.length == 0) {
        return ''
    }
    
    let out = '';
    const defaultIndent = context.getScopeVar('codeAugmentor_indent');
    
    // generate equals() override
    out += `@Override${augCode.lineSeparator}`
    out += `public boolean equals(Object obj) {`
    out += augCode.lineSeparator
    out += `${defaultIndent}if (!(obj instanceof ${context.fileScope.theClassName})) {`
    out += augCode.lineSeparator
    out += `${defaultIndent}${defaultIndent}return false;`
    out += augCode.lineSeparator
    out += `${defaultIndent}` + '}'
    out += augCode.lineSeparator
    out += `${defaultIndent}${context.fileScope.theClassName} other = (${context.fileScope.theClassName}) obj;`
    out += augCode.lineSeparator
    
    for (propSpec of context.fileScope.theClassProps) {
        if (OtherFunctions.isUpperCase(propSpec.type[0])) {
            out += defaultIndent
            out += 'if (!Objects.equals(this.'
            out += propSpec.name;
            out += ', other.' 
            out += propSpec.name
            out += ')) {'
        }
        else {
            out += defaultIndent
            out += 'if (this.'
            out += propSpec.name;
            out += ' != other.' 
            out += propSpec.name
            out += ') {'
        }
        out += augCode.lineSeparator
        out += `${defaultIndent}${defaultIndent}return false;`
        out += augCode.lineSeparator
        out += defaultIndent + '}'
        out += augCode.lineSeparator
    }
    
    out += `${defaultIndent}return true;${augCode.lineSeparator}`
    out += '}'
    out += augCode.lineSeparator
    out += augCode.lineSeparator
    
    // generate hashCode() override with Objects.hashCode()
    out += `@Override${augCode.lineSeparator}`
    out += `public int hashCode() {`
    out += augCode.lineSeparator
    if (context.fileScope.theClassProps.length == 1) {
        out += `${defaultIndent}return Objects.hashCode(`
        out += context.fileScope.theClassProps[0].name
    }
    else {
        out += `${defaultIndent}return Objects.hash(`
        for (let i = 0; i < context.fileScope.theClassProps.length; i++) {
            if (i > 0) {
                out += ', '
            }
            out += context.fileScope.theClassProps[i].name
        }
    }
    out += `);${augCode.lineSeparator}`
    out += '}'
    out += augCode.lineSeparator
    return out;
}

exports.generateToString = function(augCode, context) {
    const defaultIndent = context.getScopeVar('codeAugmentor_indent');
    let out = '';
    out += `@Override${augCode.lineSeparator}`
    out += `public String toString() {`
    out += augCode.lineSeparator
    out += `${defaultIndent}return String.format(getClass().getSimpleName() + `
    let exactOut = `"{`;
    let outArgs = '';
    for (let i = 0; i < context.fileScope.theClassProps.length; i++) {
        if (i > 0) {
            exactOut += ', '
            outArgs += ', '
        }
        exactOut += context.fileScope.theClassProps[i].name + '=%s'
        outArgs += context.fileScope.theClassProps[i].name
    }
    exactOut += '}"'
    const g = context.newGenCode()
    g.contentParts.push(context.newContent(out));
    g.contentParts.push(context.newContent(exactOut, true))
    out = ''
    if (outArgs) {
        out += ",";
        out += augCode.lineSeparator;
        out += defaultIndent;
        out += defaultIndent;
    }
    out += outArgs
    out += `);${augCode.lineSeparator}`
    out += '}'
    out += augCode.lineSeparator
    g.contentParts.push(context.newContent(out))
    return g
}