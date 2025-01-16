import {
    objectSpread
} from "@lib/common/object";

import _element from "@lib/components/Element";
import { assign as _extendsFn } from "@aq-umd/core"
import { uncompress } from "@lib/components/Data";
import { getEmojiDefaultProps } from "@lib/components/EmojiDefaultProps";
import { getData, getSanitizedData, unifiedToNative } from "@lib/components/EmojiUtils";
import _store  from "@lib/components/EmojiStore";

function createNimbleEmoji() {

    function _getData(props) {
        var emoji = props.emoji,
            skin = props.skin,
            set = props.set,
            data = props.data;
        return (0, getData)(emoji, skin, set, data);
    };

    function _getPosition(props) {
        var _getData2 = _getData(props),
            sheet_x = _getData2.sheet_x,
            sheet_y = _getData2.sheet_y,
            multiplyX = 100 / (props.sheetColumns - 1),
            multiplyY = 100 / (props.sheetRows - 1);

        return "".concat(multiplyX * sheet_x, "% ").concat(multiplyY * sheet_y, "%");
    };

    function _getSanitizedData(props) {
        var emoji = props.emoji,
            skin = props.skin,
            set = props.set,
            data = props.data;
        return (0, getSanitizedData)(emoji, skin, set, data);
    };

    function _handleClick(e, props) {
        if (!props.onClick) {
            return;
        }

        var onClick = props.onClick,
            emoji = _getSanitizedData(props);

        onClick(emoji, e);
    };

    function _handleOver(e, props) {
        if (!props.onOver) {
            return;
        }

        var onOver = props.onOver,
            emoji = _getSanitizedData(props);

        onOver(emoji, e);
    };

    function _handleLeave(e, props) {
        if (!props.onLeave) {
            return;
        }

        var onLeave = props.onLeave,
            emoji = _getSanitizedData(props);

        onLeave(emoji, e);
    };
    function _isNumeric(value) {
        return !isNaN(value - parseFloat(value));
    };

    function _convertStyleToCSS(style) {
        var div = document.createElement('div');

        for (var key in style) {
            var value = style[key];

            if (_isNumeric(value)) {
                value += 'px';
            }

            div.style[key] = value;
        }

        return div.getAttribute('style');
    };

    const NimbleEmoji = function NimbleEmoji(props) {
        if (props.data.compressed) {
            (0, uncompress)(props.data);
        }

        for (var k in NimbleEmoji.defaultProps) {
            if (props[k] == undefined && NimbleEmoji.defaultProps[k] != undefined) {
                props[k] = NimbleEmoji.defaultProps[k];
            }
        }

        var data = _getData(props);

        if (!data) {
            if (props.fallback) {
                return props.fallback(null, props);
            } else {
                return null;
            }
        }

        let userOption = _store.get("UserOption");
        var unified = data.unified,
            custom = data.custom,
            short_names = data.short_names,
            imageUrl = data.imageUrl,
            style = {},
            children = props.children,
            className = 'cssprefix-mart-emoji ' + userOption.emojiClass,
            nativeEmoji = unified && (0, unifiedToNative)(unified),
            label = [nativeEmoji].concat(short_names).filter(Boolean).join(', '),
            title = null;

        if (!unified && !custom) {
            if (props.fallback) {
                return props.fallback(data, props);
            } else {
                return null;
            }
        }

        if (props.tooltip) {
            title = short_names[0];
        }

        if (props["native"] && unified) {
            className += ' cssprefix-mart-emoji-native';
            style = {
                fontSize: props.size
            };
            children = nativeEmoji;

            if (props.forceSize) {
                style.display = 'inline-block';
                style.width = props.size;
                style.height = props.size;
                style.wordBreak = 'keep-all';
            }
        } else if (custom) {
            className += ' cssprefix-mart-emoji-custom';
            style = {
                width: props.size,
                height: props.size,
                display: 'inline-block'
            };

            if (data.spriteUrl) {
                style = objectSpread({}, style, {
                    backgroundImage: "url(".concat(data.spriteUrl, ")"),
                    backgroundSize: "".concat(100 * props.sheetColumns, "% ").concat(100 * props.sheetRows, "%"),
                    backgroundPosition: _getPosition(props)
                });
            } else {
                style = objectSpread({}, style, {
                    backgroundImage: "url(".concat(imageUrl, ")"),
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                });
            }
        } else {
            var setHasEmoji = data["has_img_".concat(props.set)] == undefined || data["has_img_".concat(props.set)];
            if (!setHasEmoji) {
                if (props.fallback) {
                    return props.fallback(data, props);
                } else {
                    return null;
                }
            } else {
                style = {
                    width: props.size,
                    height: props.size,
                    display: 'inline-block',
                    backgroundSize: "".concat(100 * props.sheetColumns, "% ").concat(100 * props.sheetRows, "%"),
                    backgroundPosition: _getPosition(props)
                };
            }
        }

        var Tag = {
            name: 'span',
            props: {}
        };

        if (props.onClick && props.useButton) {
            Tag.name = 'button';
            Tag.props = {
                type: 'button'
            };
        }



        if (props.html) {
            style = _convertStyleToCSS(style);
            return "<".concat(Tag.name, " style='").concat(style, "' aria-label='").concat(label, "' ").concat(title ? "title='".concat(title, "'") : '', " class='").concat(className, "'>").concat(children || '', "</").concat(Tag.name, ">");
        } else {
            return _element.createElement(Tag.name, (0, _extendsFn)({
                onClick: function onClick(e) {
                    return _handleClick(e, props);
                },
                onMouseEnter: function onMouseEnter(e) {
                    return _handleOver(e, props);
                },
                onMouseLeave: function onMouseLeave(e) {
                    return _handleLeave(e, props);
                },
                "aria-label": label,
                title: title,
                className: className
            }, Tag.props), _element.createElement("span", {
                style: style,
                className: "cssprefix-" + props.set
            }, children));
        }
    };


    NimbleEmoji.defaultProps = getEmojiDefaultProps();
    return NimbleEmoji;
}

export default createNimbleEmoji;

