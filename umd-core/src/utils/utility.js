
// Kiểm tra giá trị không undefined, null hoặc chuỗi rỗng
export function isValue(val) {
    return val !== undefined && val !== null && val !== "";
}

// Kiểm tra giá trị là undefined
export function isUndefined(val) {
    return val === undefined;
}

// Kiểm tra giá trị là null
export function isNull(val) {
    return typeof val === "object" && val === null;
}

// Kiểm tra giá trị là một function
export function isFn(val) {
    return typeof val === "function";
}

// Kiểm tra giá trị là một đối tượng Date hợp lệ
export function isDate(val) {
    return val instanceof Date && !isNaN(val);
}

export function isAsync(fn){
    return fn && fn.constructor && fn.constructor.name === 'AsyncFunction';
}
// Kết hợp nhiều đối tượng vào một đối tượng duy nhất
export function assign(target, ...objects) {
    // Sử dụng Object.assign nếu có, ngược lại thực hiện gán thủ công
    const _extends = Object.assign ? Object.assign.bind() : function (t, ...sources) {
        for (const source of sources) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    t[key] = source[key];
                }
            }
        }
        return t;
    };
    return _extends(target, ...objects);
}



export function getByKey(obj, key, insensitive) {
    let val = obj[key];
    if (insensitive) {
        Object.keys(obj).forEach(function (k) {
            if (k.toLowerCase() == key.toLowerCase()) {
                val = obj[k];
            }
        });
    }
    return val;
}