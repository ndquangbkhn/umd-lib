

import { isValue, removeXSS } from "../../index.js";
const TemplateContainer = document.createElement("template");
/**
 * Add class(es) to element
 * @param {Element} el - The element to add class(es) to
 * @param {string|array} cls - The class(es) to add. Can be a string or an array of strings
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * addClass(el, 'class1');
 * addClass(el, ['class2', 'class3']);
 */
export function addClass(el, cls) {
    let arr = [];
    if (Array.isArray(cls)) {
        arr = cls;
    } else if (typeof cls == "string") {
        arr = cls.split(" ").filter(x => isValue(x));
    }

    arr.forEach(element => {
        if (!el.classList.contains(element)) {
            el.classList.add(element);
        }
    });
    return DOMUtil;
}


export function prepend(parent, ...children) {
    parent.prepend(...children);
    return DOMUtil;
}

/**
 * Làm trống nội dung của phần tử cha
 * @param  {...any} elements 
 * @returns 
 */
export function empty(...elements) {
    for (const el of elements) {
        if (el) {
            const tagName = el.tagName.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                el.value = '';
            } else {
                const children = Array.from(el.children);
                for (const child of children) {
                    const newChild = child.cloneNode(false);
                    newChild.innerHTML = child.innerHTML;
                    child.replaceWith(newChild);
                }

                // Làm trống nội dung của phần tử cha
                el.innerHTML = "";
            }

        }
    }

    return DOMUtil;
}

/**
 * Tạo phần tử div
 * @param {string|array} classList - Danh sách class của phần tử
 * @param {object} attributes - Danh sách thuộc tính của phần tử
 * @returns {Element} - Phần tử div
 * @example
 * const div = createDIV('class1', { 'data-id': '123' });
 */
export function createDIV(classList, attributes) {
    return create("div", classList, attributes);
}

/**
 * Tạo phần tử từ template HTML
 * @param {*} html 
 * @returns 
 * @example
 * const el = fromTemplate('<div>new element</div>');
 */
export function fromTemplate(html) {
    html = html.trim();
    TemplateContainer.innerHTML = html;
    return TemplateContainer.content.firstChild;
}

/**
 * xóa sự kiện click cho phần tử
 * @param {Element} element - Phần tử cần xóa sự kiện
 * @param {Function} listener - Hàm xử lý sự kiện
 * @returns {Object} - Đối tượng DOMUtil
 * @example
 * const el = document.getElementById('element');
 * removeClick(el, clickHandler);
 */
export function removeClick(element, listener) {
    element.removeEventListener("click", listener);
}

/**
 * Dừng sự kiện
 * @param {*} e 
 * @returns 
 */
export function stopEvent(e) {
    e.stopPropagation();
    e.preventDefault();
    return DOMUtil;
}

/**
 * Thêm sự kiện cho phần tử
 * @param {Element} el - Phần tử cần thêm sự kiện
 * @param {string} eventName - Tên sự kiện
 * @param {Function} handler - Hàm xử lý sự kiện
 * @param {boolean} once - Có xóa sự kiện sau khi thực thi hay không
 * @returns {Object} - Đối tượng DOMUtil
 * @example
 * const el = document.getElementById('element');
 * onEvent(el, 'click', clickHandler);
 * onEvent(el, 'click', clickHandler, true);
 */
export function onEvent(el, eventName, handler, once) {
    el.addEventListener(eventName, handler, { once: !!once });
    return DOMUtil;
}

/**
 * Thêm sự kiện 1 lần cho phần tử
 * Xóa sự kiện ngay sau khi thực thi
 * @param {Element} el - Phần tử cần thêm sự kiện
 * @param {Function} handler - Hàm xử lý sự kiện
 */
export function onceEvent(el, eventName, handler) {
    el.addEventListener(eventName, handler, { once: true });
    return DOMUtil;
}

/**
 * Thêm sự kiện click cho phần tử
 * @param {Element} el - Phần tử cần thêm sự kiện
 * @param {Function} handler - Hàm xử lý sự kiện
 * @param {boolean} once - Có xóa sự kiện sau khi thực thi hay không
 * @returns {Object} - Đối tượng DOMUtil
 * @example
 * const el = document.getElementById('element');
 * onClick(el, clickHandler);
 * onClick(el, clickHandler, true);
 */
export function onClick(el, handler, once) {
    onEvent(el, "click", handler, once);
    return DOMUtil;
}

/**
 * Thêm sự kiện click 1 lần
 * @param {*} el 
 * @param {*} handler 
 * @returns 
 */
export function onceClick(el, handler) {
    onEvent(el, "click", handler, true);
    return DOMUtil;
}

/**
 * Remove class from element
 * @param {Element} el - The element to remove class from
 * @param {string} cls - The class to remove
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * removeClass(el, 'class1');
 */
export function removeClass(el, cls) {
    el.classList.remove(cls);
    return DOMUtil;
}

/**
 * Hide elements
 * @param {...Element} elements - The elements to hide
 * @returns {Object} - The DOMUtil object
 * @example
 * const el1 = document.getElementById('element1');
 * const el2 = document.getElementById('element2');
 * hide(el1, el2);
 */
export function hide(...elements) {
    for (const element of elements) {
        if (element && typeof element === 'string') {
            element = document.querySelectorAll(element);
            element.forEach(el => {
                el.style.display = 'none';
            });
        } else if (element) {
            element.style.display = 'none';
        }
    }
    return DOMUtil;
}

/**
 * Fade out element
 * @param {Element} el - The element to fade out
 * @param {number} delay - The delay in milliseconds before fading out
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * fadeOut(el, 1000);
 */
export function fadeOut(el, delay) {
    hide(el);
    return DOMUtil;
}

/**
 * Fade in element
 * @param {Element} el - The element to fade in
 * @param {number} delay - The delay in milliseconds before fading in
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * fadeIn(el, 1000);
 */
export function fadeIn(el, delay) {
    show(el);
    return DOMUtil;
}

/**
 * Show element
 * @param {Element} el - The element to show
 * @param {string} displayType - The display type to set. Defaults to "block"
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * show(el, 'inline');
 */
export function show(el, displayType) {
    if (!displayType) {
        displayType = attr(el, "display");
    }
    if (!displayType) {
        displayType = "block";
    }

    el.style.display = displayType;
    return DOMUtil;
}

/**
 * Set attribute(s) for element
 * @param {Element} el - The element to set attribute(s) for
 * @param {string|object} attributes - The attribute(s) to set. Can be a string or an object
 * @param {string} value - The value to set for the attribute(s). Only used if attributes is a string
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * attr(el, 'data-id', '123');
 * attr(el, { 'data-name': 'John', 'data-age': '30' });
 */
export function attr(el, attributes, value) {
    if (typeof attributes == "object") {
        Object.keys(attributes).forEach(key => {
            el.setAttribute(key, attributes[key] + "");
        });
    } else if (typeof attributes == "string") {
        if (arguments.length == 2) {
            return el.getAttribute(attributes);
        }

        el.setAttribute(attributes, value);
    }

    return DOMUtil;
}

/**
 * Remove attribute from element
 * @param {Element} el - The element to remove attribute from
 * @param {string} attribute - The attribute to remove
 * @returns {Object} - The DOMUtil object
 * @example
 * const el = document.getElementById('element');
 * removeAttr(el, 'data-id');
 */
export function removeAttr(el, attribute) {
    el.removeAttribute(attribute);
    return DOMUtil;
}

/**
 * Create element
 * @param {string} tagName - The tag name of the element to create
 * @param {string|array} classList - The class(es) to add to the element. Can be a string or an array of strings
 * @param {object} attributes - The attribute(s) to set for the element
 * @returns {Element} - The created element
 * @example
 * const div = create('div', 'class1', { 'data-id': '123' });
 */
export function create(tagName, classList, attributes) {
    let el = document.createElement(tagName);
    addClass(el, classList);
    attr(el, attributes);
    return el;
}

/**
 * Remove element(s)
 * @param {...Element} elements - The element(s) to remove
 * @returns {Object} - The DOMUtil object
 * @example
 * const el1 = document.getElementById('element1');
 * const el2 = document.getElementById('element2');
 * remove(el1, el2);
 */
export function remove(...elements) {
    for (const element of elements) {
        if (element) {
            if (!element) {
                console.log('Element not found');
                return;
            }

            const clonedElement = element.cloneNode(false);
            element.parentNode.replaceChild(clonedElement, element);
            element.remove();
            clonedElement.remove();
        }
    }

    return DOMUtil;
}

/**
 * Append child element(s) to parent element
 * @param {Element} parent - The parent element to append to
 * @param {...Element} children - The child element(s) to append
 * @returns {Object} - The DOMUtil object
 * @example
 * const parent = document.getElementById('parent');
 * const child1 = document.getElementById('child1');
 * const child2 = document.getElementById('child2');
 * append(parent, child1, child2);
 */
export function append(parent, ...children) {
    parent.append(...children);
    return DOMUtil;
}

/**
 * Append HTML string to parent element
 * @param {Element} parent - The parent element to append to
 * @param {string} htmlString - The HTML string to append
 * @returns {Object} - The DOMUtil object
 * @example
 * const parent = document.getElementById('parent');
 * appendHTMLString(parent, '<p>new html</p>');
 */
export function appendHTMLString(parent, htmlString) {
    parent.insertAdjacentHTML('beforeend', removeXSS(htmlString));
    return DOMUtil;
}

// Rest of the functions remain unchanged

/**
 * Set CSS style for element
 * If styleObject is string and value is undefined then get style value
 * If styleObject is string and value is not undefined then set style value
 * If styleObject is object then set multiple style values
 * @param {Element} el 
 * @param {String or object} styleObject 
 * @param {any} value 
 * @example
 * const el = document.getElementById('element');
 * css(el, 'color', 'red');
 * css(el, 'color'); // red
 * css(el, { color: 'red', fontSize: '16px' });
 * @returns 
 */
export function css(el, styleObject, value) {
    if (typeof styleObject == "string") {

        if (arguments.length == 2) {
            return window.getComputedStyle(el).getPropertyValue(styleObject);
        }

        el.style[styleObject] = value;

    } else if (typeof styleObject == "object") {
        // Lặp qua các khóa trong đối tượng kiểu
        for (const property in styleObject) {
            if (styleObject.hasOwnProperty(property)) {
                // Thiết lập giá trị CSS cho thuộc tính tương ứng trên phần tử
                try {
                    el.style[property] = styleObject[property];
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
    }
    return DOMUtil;
}

/**
 * Lấy giá trị offset của phần tử
 * @param {Element} element Phần tử cần lấy giá trị offset
 * @returns {Object} Đối tượng chứa giá trị top và left
 * @example
 * const offset = getOffset(document.getElementById('element'));
 * console.log(offset.top, offset.left);
 * @returns
 */

export function offset(el) {
    // Sử dụng phương pháp getBoundingClientRect để lấy thông tin của phần tử
    const rect = el.getBoundingClientRect();

    // Lấy giá trị cuộn của trang (scroll) từ document.documentElement
    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;


    // Trả về đối tượng chứa thuộc tính top và left
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
    };
}

/**
 * Check if element is visible on screen
 * @param {*} element 
 * @returns 
 */
export function isVisible(element) {
    // Kiểm tra thuộc tính offsetWidth và offsetHeight
    const hasSize = element.offsetWidth > 0 || element.offsetHeight > 0;
    // Lấy thuộc tính CSS của phần tử
    const style = window.getComputedStyle(element);
    // Kiểm tra thuộc tính CSS display và visibility
    const isVisibleStyle = style.display !== 'none' && style.visibility !== 'hidden';
    // Phần tử được coi là hiển thị nếu nó có kích thước và thuộc tính CSS hợp lệ
    return hasSize && isVisibleStyle;
}

/**
 * Focus on element
 * @param {Element} el 
 * @returns 
 */
export function focus(el) {
    el.focus();
    return DOMUtil;
}

/**
 * Blur on element
 * @param {Element} el
 * @returns
 * @example
 * const el = document.getElementById('element');
 * blur(el);
 * @returns
 */
export function blur(el) {
    el.blur();
    return DOMUtil;
}

/**
 * Set html or get html of element
 * if arguments.length == 1 then get html
 * if arguments.length == 2 then set html
 * @param {Element} element 
 * @param {string} html 
 * @returns 
 * @example
 * const el = document.getElementById('element');
 * const html = html(el);
 * console.log(html);
 * html(el, '<p>new html</p>');
 * @returns
*/
export function html(element, html) {
    if (!(element instanceof Element)) {
        throw new TypeError('First argument must be a DOM element');
    }

    if (arguments.length == 1) {
        return element.innerHTML;
    }

    if (html === "") {
        empty(element);
    } else if (typeof html === 'string' && html.length > 0) {
        element.innerHTML = html;
    } else if (html instanceof Node) {
        element.innerHTML = '';
        element.appendChild(html);
    } else {
        throw new TypeError('Second argument must be a string or a DOM Node');
    }
}

/**
 * Set text or get text of element
 * if arguments.length == 1 then get text
 * if arguments.length == 2 then set text
 * @param {element} el 
 * @param {string} text 
 * @returns 
 * @example
 * const el = document.getElementById('element');
 * const text = text(el);
 * console.log(text);
 * text(el, 'new text');
 */
export function text(el, text) {
    const tagName = el.tagName.toLowerCase();
    if (arguments.length == 1) {
        if (tagName === 'input' || tagName === 'textarea') {
            return el.value;
        } else if (tagName === 'select') {
            return el.options[el.selectedIndex].text;
        }

        return el.innerText;
    } else {
        if (tagName === 'input' || tagName === 'textarea') {
            el.value = text;
        } else if (tagName === 'select') {
            const options = el.options;

            for (let i = 0; i < options.length; i++) {
                if (options[i].text === text) {
                    el.selectedIndex = i;
                    break;
                }
            }
        } else {
            // For other elements (p, div, span, h1-h6)
            el.innerText = text;
        }

        return DOMUtil;
    }

}

/**
 * Set value or get value of element
 * if arguments.length == 1 then get value
 * if arguments.length == 2 then set value
 * @param {element} el 
 * @param {string} value 
 * @example 
 * const el = document.getElementById('element');
 * const value = value(el);
 * console.log(value);
 * value(el, 'new value');
 * @returns 
 */
export function value(el, value) {
    const tagName = el.tagName.toLowerCase();
    if (arguments.length == 1) {
        if (tagName === 'input' || tagName === 'textarea') {
            return el.value;
        } else if (tagName === 'select') {
            return el.options[el.selectedIndex].value;
        }

        return "";
    } else {
        if (tagName === 'input' || tagName === 'textarea') {
            el.value = value;
        } else if (tagName === 'select') {
            const options = el.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value == value) {
                    el.selectedIndex = i;
                    break;
                }
            }
        }

        return DOMUtil;
    }

}

/**
 * Lấy giá trị offset của phần tử
 * @param {Element} element Phần tử cần lấy giá trị offset
 * @returns {Object} Đối tượng chứa giá trị top và left
 * @example 
 * const offset = getOffset(document.getElementById('element'));
 * console.log(offset.top, offset.left);
 */

export function getOffset(element) {
    const rect = element.getBoundingClientRect();
    // Lấy giá trị cuộn của trang (scroll) từ document.documentElement
    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    // Trả về đối tượng chứa thuộc tính top và left
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
    };
}

export function coords(el) {
    let box = el.getBoundingClientRect();
    return {
        top: box.top + window.pageYOffset,
        left: box.left + window.pageXOffset,
        height: box.height,
        width: box.width
    };
}



const DOMUtil = {
    coords,
    addClass,
    removeClass,
    hide,
    show,
    fadeOut,
    fadeIn,
    attr,
    removeAttr,
    create,
    remove,
    append,
    prepend,
    empty,
    createDIV,
    fromTemplate,
    stopEvent,
    onEvent,
    onceEvent,
    onClick,
    onceClick,
    css,
    offset,
    isVisible,
    focus,
    blur,
    text,
    value,
    getOffset,
    appendHTMLString,
    html
};

export default DOMUtil;
