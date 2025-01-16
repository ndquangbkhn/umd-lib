export function serialize(obj) {
    if (Array.isArray(obj)) {
        return JSON.stringify(obj);
    } else {
        const getCircularReplacer = () => {
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return;
                    }
                    seen.add(value);
                }
                return value;
            };
        };

        return JSON.stringify(obj, getCircularReplacer());
    }
}

export function deserialize(text) {
    if (typeof text == 'string') {
        try {
            return JSON.parse(text);
        } catch (e) {
            return {};
        }
    } else if (typeof text == 'object' && Object.keys(text).length > 0) {
        return text;
    } else {
        return {};
    }
}

export function decodeHTML(text) {
    let t = text + "";
    let txt = document.createElement("textarea");
    txt.innerHTML = t;
    t = txt.value;
    return t;
}

export function encodeHTML(text) {
    let t = text + "";
    let txt = document.createElement("textarea");
    txt.innerHTML = t;
    t = txt.innerHTML; 
    txt = null;
    return t;
}