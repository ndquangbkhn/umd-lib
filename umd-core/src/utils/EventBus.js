const bus = {};

export default {
    send(eventName, ...data) {
        if (bus[eventName]) {
            bus[eventName].forEach(fn => fn(...data));
        }
    },
    on(eventName, fn) {
        if (!bus[eventName]) {
            bus[eventName] = [];
        }
        bus[eventName].push(fn);
    },
}