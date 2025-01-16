 
import "./styles/main.css";
import _all from '@data/data';
import _store from './components/EmojiStore';

import stringFromCodePoint from "./components/StringFromCodePoint";
import createRegex from "./components/Regex";
import createBox from "./components/Box";
import {toEmoji } from "./components/Emoticons";

import { CustomScrollCSS } from "@misa-umd/controls";
CustomScrollCSS.init();

const NativeMap = _store.get("NativeMap") || {};
_store.set("NativeMap", NativeMap);
_store.set("language", "vi");
_store.set("Theme", {
    Light: "light",
    Dark: "dark"
});

const EmojiType = {
    Facebook: "facebook",
    Google: "google",
    Apple: "apple"
};
_store.set("EmojiType", EmojiType);


const EmojiRegex = createRegex();
const TestRegexp = EmojiRegex.TestRegexp;
const Regexp = EmojiRegex.Regexp;

function initEmoji(container, contentEditable, afterSelectEmoji, theme, color, set, language) {
    if (language == "vi" || language == "en") {
        _store.set("language", language);
    }

    function focusToEnd(element) {
        element.focus();
        execCommand('selectAll', null);
        collapseSelectionEnd();
    }
    function execCommand(command, param) {
        if (window.getSelection) {
            try {
                if (document.queryCommandSupported && !document.queryCommandSupported(command))
                    return false;
                return document.execCommand(command, false, param);
            }
            catch (e) {
            }
        }
        // xu ly cho IE
        else if (document.selection) {
            var sel = document.selection;
            if (sel.type != 'None') {
                var range = sel.createRange();
                try {
                    if (!range.queryCommandEnabled(command))
                        return false;
                    return range.execCommand(command, false, param);
                }
                catch (e) {
                }
            }
        }
    }
    function collapseSelectionEnd() {
        if (window.getSelection) {
            let sel = window.getSelection();
            if (!sel.isCollapsed)
                sel.collapseToEnd();
        }
        else if (document.selection) {
            let sel = document.selection;
            if (sel.type != 'Control') {
                var range = sel.createRange();
                range.collapse(false);
                range.select();
            }
        }
    }
    function createRange(node, chars, range) {
        try {
            if (!range) {
                if (node.nodeType === Node.TEXT_NODE) {
                    range = document.createRange();
                    range.selectNode(node);
                    range.setStart(node, 0);
                }
            }

            if (chars.count === 0) {
                range.setEnd(node, chars.count);
            } else if (node && chars.count > 0) {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.textContent.length < chars.count) {
                        chars.count -= node.textContent.length;
                    } else {
                        range.setEnd(node, chars.count);
                        chars.count = 0;
                    }
                } else {
                    for (var lp = 0; lp < node.childNodes.length; lp++) {
                        range = createRange(node.childNodes[lp], chars, range);

                        if (chars.count === 0) {
                            break;
                        }
                    }
                }
            }
        } catch (ex) {
            console.log(ex);
        }


        return range;
    }
    function isChildOf(node, parentElement) {
        while (node !== null) {
            if (node === parentElement) {
                return true;
            }
            node = node.parentNode;
        }

        return false;
    }
    function getCurrentCursorPosition(parentElement) {
        var selection = window.getSelection(),
            charCount = -1,
            node;

        if (selection.focusNode) {
            if (isChildOf(selection.focusNode, parentElement)) {
                node = selection.focusNode;
                charCount = selection.focusOffset;

                while (node) {
                    if (node === parentElement) {
                        break;
                    }

                    if (node.previousSibling) {
                        node = node.previousSibling;
                        charCount += node.textContent.length;
                    } else {
                        node = node.parentNode;
                        if (node === null) {
                            break;
                        }
                    }
                }
            }
        }

        return charCount;
    }
    function setCurrentCursorPosition(chars, element) {
        try {
            if (chars >= 0) {
                var selection = window.getSelection();

                var range = createRange(element, { count: chars });

                if (range) {
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        } catch (ex) {
            console.log(ex);
        }

    }
    function pasteHtmlAtCaret(html) {
        var sel, range;
        if (window.getSelection) {
            // IE9 and non-IE
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();

                // Range.createContextualFragment() would be useful here but is
                // only relatively recently standardized and is not supported in
                // some browsers (IE9, for one)
                var el = document.createElement("div");
                el.innerHTML = html;
                var frag = document.createDocumentFragment(), node, lastNode;
                while ((node = el.firstChild)) {
                    lastNode = frag.appendChild(node);
                }
                range.insertNode(frag);

                // Preserve the selection
                if (lastNode) {
                    range = range.cloneRange();
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        } else if (document.selection && document.selection.type != "Control") {
            // IE < 9
            document.selection.createRange().pasteHTML(html);
        }
    }

    contentEditable.addEventListener('click', (event) => {
        contentEditable.currentCursor = getCurrentCursorPosition(contentEditable);
    });

    contentEditable.addEventListener('keyup', (event) => {
        contentEditable.currentCursor = getCurrentCursorPosition(contentEditable);
    });


    var onSelect = function (data) {
        if (!contentEditable.currentCursor) {
            focusToEnd(contentEditable);
        } else {
            setCurrentCursorPosition(contentEditable.currentCursor, contentEditable);
        }
        setTimeout(function () {
            pasteHtmlAtCaret(data.native);
            if (typeof afterSelectEmoji == "function") afterSelectEmoji();
        }, 10);
    };

    const EmojiType = _store.get("EmojiType");
    const Theme = _store.get("Theme");
    if (!set) set = EmojiType.Facebook;
    if (!theme) theme = Theme.Light;
    if (!color) color = '#2196f3';
    var option = {
        class: "",
        set: set,
        emojiClass: "",
        theme: theme,
        color: color,
        state: _all.state
    };

    _store.set("UserOption", option);

    option.onSelect = onSelect;
    createBox(container)
}

function decodeEmoji(html) {
    var div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("img[native]").forEach(function (img) {
        var str = img.getAttribute("native");
        if (!str) {
            str = ":" + img.getAttribute("label") + ":";
        }
        if (str) {
            //if outerHTML is supported
            if (img.outerHTML) {
                img.outerHTML = str;
            }
            else {
                var tmpObj = document.createElement("div");
                tmpObj.innerHTML = '<!--THIS DATA SHOULD BE REPLACED-->';
                ObjParent = img.parentNode;
                ObjParent.replaceChild(tmpObj, img);
                ObjParent.innerHTML = ObjParent.innerHTML.replace('<div><!--THIS DATA SHOULD BE REPLACED--></div>', str);
            }
        } else {

        }

    });
    var outStr = div.innerHTML;
    div.remove();
    return outStr;
}

function encodeEmoji(text, set, size) {
    return text.replace(Regexp, function (code) {
        var tmp = code;
        if (!size) size = "16px";
        if (code.indexOf(":") == 0) {
            code = code.substr(1, code.length - 2);
            tmp = _codeToHtml(code, set, size);
        } else {
            tmp = _navtiveCodeToHtml(code, set, size);
        }
        if (!tmp) tmp = code;
        return tmp;
    });
}

function isEmoji(text) {
    try {
        TestRegexp.lastIndex = 0;
        return TestRegexp.test(text);
    } catch (ex) {
        console.log(ex);
        return false;
    }

}



function _navtiveCodeToHtml(nativeText, set, size) {
    const EmojiType = _store.get("EmojiType");
    const NativeMap = _store.get("NativeMap");

    if (!set) set = EmojiType.Facebook;
    var id = NativeMap[nativeText];
    if (!id) {
        for (var name in NativeMap) {
            var regex = "([" + name + "]{1,})";

            var m1 = nativeText.match(new RegExp(regex, "gi"));
            if (m1 && m1.length == 1 && m1[0] == nativeText) {
                id = NativeMap[name];
                break;
            }
            var regex2 = "([" + name + "]{2,})";
            var m2 = nativeText.match(new RegExp(regex2, "gi"));
            if (m2 && m2.length == 1 && m2[0] == nativeText) {
                id = NativeMap[name];
                break;
            }
        }
    }
    if (id) {
        var emoj = _all.emojis[id];
        return _createEmojiTag(id, nativeText, emoj, set, size);
    } else {
        return nativeText;
    }
}

function _codeToHtml(id, set, size) {
    const EmojiType = _store.get("EmojiType");
    if (!set) set = EmojiType.Facebook;
    var emoj = _all.emojis[id];
    var unified = emoj.unified || emoj.b || "";
    var unicodes = unified.split('-');
    var codePoints = unicodes.map(function (u) {
        return "0x".concat(u);
    });

    var nativeText = stringFromCodePoint.apply(null, codePoints);
    return _createEmojiTag(id, nativeText, emoj, set, size);
}

function _createEmojiTag(id, nativeText, emoj, set, iconSize) {

    var _getEmojiPosition = function (emoj) {
        var sheet_x = emoj.sheet_x,
            sheet_y = emoj.sheet_y;

        if (emoj.k && emoj.k.length == 2) {
            sheet_x = emoj.k[0];
            sheet_y = emoj.k[1];
        }

        var multiplyX = 100 / (_all.sheet.sheetColumns - 1),
            multiplyY = 100 / (_all.sheet.sheetRows - 1);
        return "".concat(multiplyX * sheet_x, "% ").concat(multiplyY * sheet_y, "%");
    };

    if (!iconSize) iconSize = "16px";
    var label = id;
    var position = _getEmojiPosition(emoj);
    var className = "cssprefix-" + set;
    var size = "".concat(100 * _all.sheet.sheetColumns, "% ").concat(100 * _all.sheet.sheetRows, "%");
    var style = [
        "position:relative",
        "display:inline-block",
        "font-size: 0",
        "margin: 0",
        "padding: 0",
        "vertical-align: middle",
        "border: none",
        "width:" + iconSize + "; height:" + iconSize,
        "display: inline-block",
        "background-position:" + position,
        "background-size:" + size].join(";");
    var template = ['<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" native="', nativeText, '"  label="', label, '" style="' + style + '" class="', className, '"/>'].join("");

    return template;
}



export {
    initEmoji,
    encodeEmoji,
    decodeEmoji,
    isEmoji,
    toEmoji,
    EmojiType
}