
import { create as makeStore, EventBus }  from '@misa-umd/core'; // Add this line
import __css from "@setting/css";
import libConfig from "@config";
import resource from "@resource";
import apiService from '@setting/service'; // Add this line

const __config = {};
const __appData = {
    language: "vi"
};

loadConfig(libConfig);

export function loadConfig(data) {
    Object.assign(__config, data);
    return getConfig();
}

export function getConfig() {
    return { ...__config };
}
export function getResource(language) {
    if (!language) language = getLanguage();
    return { ...resource[language] };
}

export function onEventBus(eventName, fn) {
    EventBus.on(eventName, fn);
}

export function sendEventBus(eventName, ...data) {
    EventBus.send(eventName, ...data);
}

export function setLanguage(lang) {
    __appData.language = lang;
}

export function getLanguage() {
    return __appData.language + "";
}

export function createStore(config) {
    return makeStore(config);
}

export function getService(){
    return apiService;
}

export default {
    createStore,
    onEventBus,
    sendEventBus,
    loadConfig,
    getConfig,
    getResource,
    setLanguage,
    getLanguage,
    getService
}