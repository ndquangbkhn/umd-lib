﻿const emptyObject = {};
Object.freeze(emptyObject);

function makeEmptyFunction(arg) {
    return function () {
        return arg;
    };
}


const emptyFunction = function emptyFunction() { };

emptyFunction.thatReturns = makeEmptyFunction;
emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction.thatReturnsNull = makeEmptyFunction(null);
emptyFunction.thatReturnsThis = function () {
    return this;
};
emptyFunction.thatReturnsArgument = function (arg) {
    return arg;
};

export {
    emptyObject,
    emptyFunction
}