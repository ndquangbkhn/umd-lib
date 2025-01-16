import stateProxy from "./state";

function handlers(proxyData, handlers) {
    Object.keys(handlers).forEach(property => {
        const handlerFn = handlers[property];
        if (typeof handlerFn === 'function') {
            proxyData.registerHandler(property, handlerFn);
        }
    });
}



export function create(config) {
    let mutations = {};
    let actions = {};
    let getters = {};
    const newStore = {

    };
    if (config.state) {
        Object.keys(config.state).forEach(key => {
            stateProxy[key] = config.state[key];
        });
    }

    if (config.getters) {
        Object.keys(config.getters).forEach(fnName => {
            getters[fnName] = config.getters[fnName].bind({ state: stateProxy });
        });
    }

    // Sử dụng Proxy để chuyển các phương thức thành thuộc tính
    getters = new Proxy(config.getters, {
        get(target, prop) {
            const func = target[prop];
            if (typeof func === 'function') {
                // Kiểm tra số lượng tham số của hàm
                if (func.length ===  1) {
                    // Hàm không có tham số
                    return func(stateProxy);  // Gọi hàm mà không cần tham số
                } else {
                    // Hàm có tham số
                    return (...args) => func(stateProxy,...args);  // Gọi hàm với các tham số
                }
            }

            return func;
        }
    });


    if (config.actions) {
        Object.keys(config.actions).forEach(fnName => {
            if (typeof config.actions[fnName] == "function") {
                actions[fnName] = config.actions[fnName].bind({ store: newStore });
            } else {
                console.error(`action ${fnName} must be a function`);
            }
        });
    }
    if (config.mutations) {
        Object.keys(config.mutations).forEach(fnName => {
            if (typeof config.mutations[fnName] == "function") {
                mutations[fnName] = config.mutations[fnName].bind({ state: stateProxy });
            } else {
                console.error(`mutations ${fnName} must be a function`);
            }

        });
    }

    newStore.getters = getters;
    newStore.actions = actions;
    newStore.mutations = mutations;

    newStore.dispatch = function (actionName, ...data) {
        return actions[actionName](newStore, ...data);
    };
    newStore.commit = function (mutationName, ...data) {
        return mutations[mutationName](stateProxy, ...data);
    };
    newStore.handlers = handlers.bind(newStore);
    return newStore;
}