export function shallowEqual(objA, objB) {
    function is(x, y) { return x === y ? x !== 0 || y !== 0 || 1 / x === 1 / y : x !== x && y !== y; }
    if (is(objA, objB)) { return true; }
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) { return false; }
    var keysA = Object.keys(objA), keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) { return false; }

    for (var i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) { return false; }
    }
    return true;
}
