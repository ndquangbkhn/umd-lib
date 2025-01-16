const exportFn = String.fromCodePoint || function stringFromCodePoint() {
    const MAX_SIZE = 0x4000;
    let codeUnits = [];
    let highSurrogate;
    let lowSurrogate;
    let index = -1;
    let length = arguments.length;

    if (!length) {
        return '';
    }

    let result = '';

    while (++index < length) {
        let codePoint = Number(arguments[index]);

        if (!isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
            codePoint < 0 || // not a valid Unicode code point
            codePoint > 0x10ffff || // not a valid Unicode code point
            Math.floor(codePoint) != codePoint // not an integer
        ) {
            throw RangeError('Invalid code point: ' + codePoint);
        }

        if (codePoint <= 0xffff) {
            // BMP code point
            codeUnits.push(codePoint);
        } else {
            codePoint -= 0x10000;
            highSurrogate = (codePoint >> 10) + 0xd800;
            lowSurrogate = codePoint % 0x400 + 0xdc00;
            codeUnits.push(highSurrogate, lowSurrogate);
        }

        if (index + 1 === length || codeUnits.length > MAX_SIZE) {
            result += String.fromCharCode.apply(null, codeUnits);
            codeUnits.length = 0;
        }
    }

    return result;
};

export default exportFn;
