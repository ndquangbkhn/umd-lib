import { createProxy } from './proxy.js'

export default new Proxy({}, {
    set(target, property, value) {
        target[property] = createProxy(value);
        return true; // Xác nhận rằng việc gán đã thành công
    }
});




