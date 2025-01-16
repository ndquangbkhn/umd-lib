import { isFn } from '../utils/utility.js';
import { scrollEvent } from '../utils/scroll.js';
import { onKeyEvent } from '../utils/keyboard.js';
import EventBus from '../utils/EventBus.js';
import DOMUtil  from '../utils/dom.js';

const protectedMethods = ["__mount", "__create", "__define", "__render"];
const __render = Symbol("__render");
const __create = Symbol("__create");
const __mount = Symbol("__mount");
const __define = Symbol("__define");
const onScroll = Symbol("onScroll");
const onClick = Symbol("onClick");
const onKeyboard = Symbol("onKeyboard");


class BaseDOMClass {

    ui_monitor = {};
    options = {};
    language = "vi";
    resource = {};
    element = null;
    template = "<div></div>";
    events = {};
    els = {
        first: (querySelector, handler) => {
            let item = this.element.querySelector(querySelector);
            if (typeof handler === "function") {
                handler.call(this, item);
            }
            return item;
        },
        all: (querySelector, handler) => {
            let items = this.element.querySelectorAll(querySelector);
            if (typeof handler === "function") {
                items.forEach(handler.bind(this));
            }
            return items;
        }
    };

    sendEventBus = EventBus.send;
    [__define] = {
        resource: {},
        template: null,
        events: {},
        created: () => { },
        mounted: () => { },
        unmounted: () => { },
        click: {
            "element": (e, el) => {
                console.log("click element");
            }
        },
        scroll: {
            "element": {
                onScroll: (isScrollDown) => {
                    console.log("scroll element");
                },
                onStopScroll: (isScrollDown) => {
                    console.log("stop scroll element");
                },
                onTotalScroll: () => {
                    console.log("total scroll element");
                },
                onTotalScrollBack: () => {
                    console.log("total scroll back element");
                }
            }
        }
    };

    constructor(container, options = {}) {

        // Lấy danh sách các phương thức của lớp con
        const childMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));

        // Kiểm tra xem lớp con có định nghĩa lại bất kỳ phương thức nào trong danh sách không
        const duplicateMethods = childMethods.filter((method) =>
            protectedMethods.includes(method)
        );

        if (duplicateMethods.length > 0) {
            throw new Error(
                `Lớp con không được phép ghi đè các phương thức sau: ${duplicateMethods.join(", ")}`
            );
        }

        this.container = container || document.body;
        this.options = options;
        this.language = this.options.language || "vi";

    }

    mergeOptions(defaults = {}) {
        this.options = { ...defaults, ...this.options };
    }


    //render element
    [__render]() {

        Object.keys(this.override).forEach((key) => {
            if (typeof this.override[key] == "function") {
                this[__define][key] = this.override[key].bind(this);
            } else {
                this[__define][key] = this.override[key];
            }
        });

        if (this[__define].resource) {
            if (isFn(this[__define].resource)) {
                this.resource = this[__define].resource.call(this);
            } else {
                this.resource = this[__define].resource;
            }
        }


        this.template = this[__define].template || this.template;

        this[__create]();
        this[__define].created();
        this.ui_monitor.rendered = true;

        let binding = this[__define].binding;
        if (isFn(binding)) {
            let config = binding.call(this);
            if (Array.isArray(config)) {
                config.forEach((item) => {
                    let src = item.src;
                    if (isFn(src.registerHandlers)) src.registerHandlers.call(this, item.map);
                    item.map && Object.keys(item.map).forEach((key) => {
                        if (isFn(item.map[key])) {
                            item.map[key].call(this, src[key]);
                        }
                    });
                });
            }
        }

        let eventBus = this[__define].eventBus;
        if (eventBus && Object.keys(eventBus).length > 0) {
            Object.keys(eventBus).forEach((key) => {
                EventBus.on(key, eventBus[key]);
            });
        }

        this[__mount](this.container); //write to body

        //khai báo sự kiện
        this[onScroll]();
        this[onKeyboard]();
        DOMUtil.onClick(this.element, this[onClick].bind(this));

        this[__define].mounted();

        this.fireEvent("mounted", {}, this);
        this.ui_monitor.mounted = true;


    }
    containsTarget(target) {
        return this.element.contains(target);
    }

    fireEvent(name, e, ...data) {
        if (isFn(this.events[name])) {
            this.events[name].call(this, e, ...data);
        }
    }

    //Xử lý sự kiện nhấn phím
    [onKeyboard]() {
        let keyboardConfig = this[__define].keyboard;
        if (keyboardConfig && keyboardConfig !== "function" && Object.keys(keyboardConfig).length > 0) {
            let callFn = (fn, target, code, e) => {
                fn.call(this, target, code, e);
            };

            Object.keys(keyboardConfig).forEach((key) => {
                let el;
                if ("body" == key) {
                    el = document.body;
                } else if ("element" === key) {
                    el = this.element;
                } else {
                    el = this.els.first(key);
                }

                if (el) {
                    let config = this[__define].keyboard[key];
                    let hanldes = {
                        onKeyDown: isFn(config.onKeyDown) ? (target, code, e) => { callFn(config.onKeyDown, target, code, e); } : null,
                        onEnter: isFn(config.onEnter) ? (target, code, e) => { callFn(config.onEnter, target, code, e); } : null,
                        onESC: isFn(config.onESC) ? (target, code, e) => { callFn(config.onESC, target, code, e); } : null,
                        onKeyPress: isFn(config.onKeyPress) ? (target, code, e) => { callFn(config.onKeyPress, target, code, e) } : null,
                        onKeyUp: isFn(config.onKeyUp) ? (target, code, e) => { callFn(config.onKeyUp, target, code, e); } : null
                    };
                    onKeyEvent(el, hanldes);
                } else {
                    console.warn("Element not found: ", key);
                }
            });
        }
    }

    //Xử lý sự kiện scroll
    [onScroll]() {
        if (this[__define].scroll && this[__define].scroll !== "function") {
            let callFn = (fn, ...arg) => {
                if (isFn(fn)) {
                    fn.call(this, ...arg);
                }
            };

            Object.keys(this[__define].scroll).forEach((key) => {
                let el;
                if ("body" == key) {
                    el = document.body;
                } else if ("element" === key) {
                    el = this.element;
                } else {
                    el = this.element.querySelector(key);
                }

                if (el) {
                    let config = this[__define].scroll[key];
                    let hanldes = {
                        onScroll: () => {
                            callFn(config.onScroll);
                        },
                        onStopScroll: (isScrollDown) => {
                            callFn(config.onStopScroll, isScrollDown);
                        },
                        onTotalScroll: (isScrollDown) => {
                            callFn(config.onTotalScroll, isScrollDown);
                        },
                        onTotalScrollBack: (isScrollDown) => {
                            callFn(config.onTotalScrollBack, isScrollDown);
                        }
                    };
                    scrollEvent(el, hanldes, 100);
                } else {
                    console.warn("Element not found: ", key);
                }
            });
        }
    }


    //Xử lý sự kiện click
    [onClick](e) {
        if (this[__define].click && this[__define].click !== "function") {
            Object.keys(this[__define].click).forEach((key) => {
                if ("element" === key) {
                    this[__define].click.element.call(this, e, this.element);
                } else if (e.target.closest(key)) {
                    this[__define].click[key].call(this, e, e.target.closest(key));
                }
            });
        }

        this.fireEvent("click", e, this.element);
    }

    //tạo elements
    [__create]() {
        this.template = this.template || "<div></div>";
        this.element = DOMUtil.fromTemplate(this.template);
        DOMUtil.addClass(this.element, this.options.class);
        this.els.all("[obj]", (el) => {
            let name = el.getAttribute("obj");
            if (name == "all" || name == "first") {
                throw new Error("Can not use obj name: " + name);
            }
            this.els[name] = el;
        });

        const resource = this.resource;
        this.els.all("[res-key]", (item) => {
            let key = item.getAttribute("res-key");
            item.innerText = resource[key] || "";
        });

        this.els.all("[res-title]", (item) => {
            let key = item.getAttribute("res-title");
            item.setAttribute("title", resource[key] || "");
        });

        this.els.all("[res-placeholder]", (item) => {
            let key = item.getAttribute("res-placeholder");
            let tagName = item.tagName.toUpperCase();
            if (tagName == 'INPUT' || tagName == 'TEXTAREA') {
                item.setAttribute("placeholder", resource[key] || "");
            } else {
                item.setAttribute("data-placeholder", resource[key] || "");
            }
        });
    }

    //mount vào parent
    [__mount](parent) {
        if (parent && parent.appendChild) {
            parent.appendChild(this.element);
        }
    }

    //đăng ký sự kiện
    onEvent(event, callback) {
        if (isFn(callback)) {
            this.events[event] = callback;
        }
    }

    //xử lý ẩn
    hide() {
        this.beforeHide();
        if (this.element) {
            this.hideHandler();
        }
        this.elementShowed = false;
        this.fireEvent("hide", this.element);
        this.afterHide();
    }
    beforeHide() {

    }
    afterHide() {

    }
    hideHandler() {
        DOMUtil.hide(this.element);
    }

    doRender() {
        if (!this.ui_monitor.rendered) {
            this[__render]()
        }
    }

    //xử lý hiển thị
    show() {

        this.doRender();
        this.beforeShow(...arguments);
        this.showHandler(...arguments);
        this.elementShowed = true;
        this.fireEvent("show", this.element);
        this.afterShow(...arguments);
    }
    beforeShow() {

    }
    afterShow() {

    }
    showHandler() {
        DOMUtil.show(this.element);
    }

    isShow() {
        return this.elementShowed;
    }

    toggle() {
        if (this.isShow()) {
            this.hide();
        } else {
            this.show();
        }
    }

    //gọi khi dispose
    dispose() {
        if (this.element) {
            DOMUtil.remove(this.element);
        }
        this[__define].unmounted();
        this.elementShowed = false;
    }
}

const lockConfig = {
    writable: false, // Không cho phép ghi đè
    configurable: false, // Không cho phép xóa
};
const locked = ["mount", "create", "dispose"];

locked.forEach((key) => {
    Object.defineProperty(BaseDOMClass.prototype, key, lockConfig);
});


// Xuất class Button
export default BaseDOMClass;

