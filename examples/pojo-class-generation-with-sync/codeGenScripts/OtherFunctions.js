exports.capitalize = function(s) {
    if (s) {
        s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    return s;
}

exports.isUpperCase = function(c) {
    return c == c.toUpperCase();
}
