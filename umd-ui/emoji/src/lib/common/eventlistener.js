﻿
import { emptyFunction } from "@lib/common/emptyfn";

const EventListener = {
    /**
     * Listen to DOM events during the bubble phase.
     *
     * @param {DOMEventTarget} target DOM element to register listener on.
     * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
     * @param {function} callback Callback function.
     * @return {object} Object with a `remove` method.
     */
    listen: function listen(target, eventType, callback) {
        if (target.addEventListener) {
            target.addEventListener(eventType, callback, false);
            return {
                remove: function remove() {
                    target.removeEventListener(eventType, callback, false);
                }
            };
        } else if (target.attachEvent) {
            target.attachEvent('on' + eventType, callback);
            return {
                remove: function remove() {
                    target.detachEvent('on' + eventType, callback);
                }
            };
        }
    },

    /**
     * Listen to DOM events during the capture phase.
     *
     * @param {DOMEventTarget} target DOM element to register listener on.
     * @param {string} eventType Event type, e.g. 'click' or 'mouseover'.
     * @param {function} callback Callback function.
     * @return {object} Object with a `remove` method.
     */
    capture: function capture(target, eventType, callback) {
        if (target.addEventListener) {
            target.addEventListener(eventType, callback, true);
            return {
                remove: function remove() {
                    target.removeEventListener(eventType, callback, true);
                }
            };
        } else {
            console.error('Attempted to listen to events during the capture phase on a ' + 'browser that does not support the capture phase. Your application ' + 'will not receive some events.');
            return {
                remove: emptyFunction
            };
        }
    },

    registerDefault: function registerDefault() { }
};

export default EventListener;
