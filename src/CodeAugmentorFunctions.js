exports.setScopeVar = function(augCode, context) {
    modifyScope(context.fileScope, augCode);
    return context.newSkipGenCode();
};

exports.setGlobalScopeVar = function(augCode, context) {
    modifyScope(context.globalScope, augCode);
    return context.newSkipGenCode();
};

function modifyScope(scope, augCode) {
    for (arg of augCode.args) {
        Object.assign(scope, arg);
    }
}