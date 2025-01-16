function isFn(fn) {
    return typeof fn === 'function';
}

export function isCharacterKeyPress(evt) {
    if (typeof evt.which == "undefined") {
        // This is IE, which only fires keypress events for printable keys
        return true;
    } else if (typeof evt.which == "number" && evt.which > 0) {
        // In other browsers except old versions of WebKit, evt.which is
        // only greater than zero if the keypress is a printable key.
        // We need to filter out backspace and ctrl/alt/meta key combinations
        return !evt.ctrlKey && !evt.metaKey && !evt.altKey && evt.which != 8 && evt.which != 27 && evt.which != 13 && (evt.which < 37 || evt.which > 40);
    }
    return false;
}

export function onKeyEvent(element, actions) {
    if (isFn(actions.onKeyDown) || isFn(actions.onEnter) || isFn(actions.onESC)) {
        let handleKeyDown = function (e) {
            var code = e.which;
            var target = e.target;
            if (isFn(actions.onKeyDown)) {
                actions.onKeyDown(target, code, e);
            }
            if (code == 13 && isFn(actions.onEnter)) {
                actions.onEnter(target, code, e);
            }

            if (code == 27 && isFn(actions.onESC)) {
                actions.onESC(target, code, e);
            }
        };
        element.addEventListener('keydown', handleKeyDown);
    }

    if (isFn(actions.onKeyPress)) {

        let handleKeyPress = function (e) {
            let code = e.which;
            let target = e.target;
            actions.onKeyPress(target, code, e);
        };

        element.addEventListener('keypress', handleKeyPress);

    }

    if (isFn(actions.onKeyUp)) {

        let handleKeyUp = function (e) {
            var code = e.which;
            var target = e.target;
            actions.onKeyUp(target, code, e);
        };

        element.addEventListener('keyup', handleKeyUp);

    }

}