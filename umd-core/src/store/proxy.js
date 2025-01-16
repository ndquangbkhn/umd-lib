// Hàm để tạo proxy từ một dữ liệu bất kỳ
export function createProxy(data) {
    if (data === null || data === undefined) {
        return null;
    }
    // Nếu data đã là một Proxy, trả về chính nó
    if (data && data.__isProxy) {

        return data;
    }

    let proxyData;
    // Nếu data là kiểu nguyên thủy, bao nó trong một đối tượng
    const isPrimitive = (value) => value !== Object(value);

    if (isPrimitive(data)) {
        proxyData = new Proxy({
            primitiveValue: data,
            __isPrimitive: true            
        }, {
            handlers: {},
            get(target, prop) {
                if (prop === '__isPrimitive') {
                    return true;
                }
                if (prop === '__isProxy') {
                    return true;
                }
                if(prop === 'registerHandlers'){
                    let self = this;
                    return function (handlers) {
                        Object.keys(handlers).forEach(property => {
                            const handlerFn = handlers[property];
                    
                            if (typeof handlerFn === 'function') {
                                self.registerHandler(property, handlerFn);
                            }
                        });
                        
                    }
                }
                if (prop === 'valueOf' || prop === 'toString') {
                    return () => target.primitiveValue; // Trả về giá trị nguyên thủy
                }
                if (prop === Symbol.toPrimitive) {
                    return (hint) => {
                        if (hint === 'number') return Number(target.primitiveValue);
                        if (hint === 'string') return String(target.primitiveValue);
                        return target.primitiveValue;
                    };
                }

                return Reflect.get(...arguments);
            },
            set(target, prop, newValue) {
                if (prop === 'primitiveValue') {
                    target.primitiveValue = newValue;
                    // Gọi handler nếu có đăng ký
                    if (this.handlers[property]) {
                        this.handlers[property].forEach(handler => handler(value, oldValue));
                    }
                }
                return false;
            },
            registerHandler(property, handlerFn) {
                if (!this.handlers[property]) {
                    this.handlers[property] = [];
                }
                this.handlers[property].push(handlerFn);
            }
        });
    } else if (Array.isArray(data)) {
        // Nếu là mảng, tạo proxy cho từng phần tử và bản thân mảng
        const proxiedArray = data.map(item => createProxy(item));

        proxyData = new Proxy(proxiedArray, {
            handlers: {},
            get(target, prop) {
                if(prop === 'registerHandlers'){
                    let self = this;
                    return function (handlers) {
                        Object.keys(handlers).forEach(property => {
                            const handlerFn = handlers[property];
                    
                            if (typeof handlerFn === 'function') {
                                self.registerHandler(property, handlerFn);
                            }
                        });
                    }
                }
                if (prop === '__isProxy') {
                    return true;
                }
                
                return Reflect.get(...arguments);
            },

            set(target, property, value) {
                const oldValue = target[property];
                target[property] = Array.isArray(value) ? value.map(item => createProxy(item)) : createProxy(value);

                // Gọi handler nếu có đăng ký
                if (this.handlers[property]) {
                    this.handlers[property].forEach(handler => handler(value, oldValue));
                }

                return true;
            },

            registerHandler(property, handlerFn) {
                if (!this.handlers[property]) {
                    this.handlers[property] = [];
                }
                this.handlers[property].push(handlerFn);
            }
        });
    } else {
        // Nếu là đối tượng, tạo proxy cho đối tượng
        proxyData = new Proxy({...data}, {
            handlers: {},
            get(target, prop) {
                if(prop === 'registerHandlers'){
                    let self = this;
                    return function (handlers) {
                        Object.keys(handlers).forEach(property => {
                            const handlerFn = handlers[property];
                    
                            if (typeof handlerFn === 'function') {
                                self.registerHandler(property, handlerFn);
                            }
                        });
                        return true;
                    }
                }

                if (prop === '__isProxy') {
                    return true;
                }
                return Reflect.get(...arguments);
            },

            set(target, property, value) {
                const oldValue = target[property];
                target[property] = value; // createProxy(value);

                // Gọi handler nếu có đăng ký
                if (this.handlers[property]) {
                    this.handlers[property].forEach(handler => handler(value, oldValue));
                }

                return true;
            },
            registerHandler(property, handlerFn) {
                if (!this.handlers[property]) {
                    this.handlers[property] = [];
                }
                this.handlers[property].push(handlerFn);
            }
        });
    }





    return proxyData;
}
 