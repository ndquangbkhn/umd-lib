import {
    getPrototypeOf,
    objectSpread
} from "@lib/common/object";

import { createClass, possibleConstructorReturn, classCallCheck } from "@lib/common/class";

import _inherits from "@lib/common/inherits";
import _element from "@lib/components/Element";
import _frequently from "@lib/components/Frequently";
import {getData } from "@lib/components/EmojiUtils";
import _nimbleEmoji from "@lib/components/NimbleEmoji";
import _notFound from "@lib/components/NotFound";

const Category = function (param) {
    (0, _inherits)(Category, param);

    function Category(props) {
        let _this;

        classCallCheck(this, Category);
        _this = (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(Category).call(this, props));
        _this.data = props.data;
        _this.setContainerRef = _this.setContainerRef.bind(_this);
        _this.setLabelRef = _this.setLabelRef.bind(_this);
        return _this;
    }

    (0, createClass)(Category, [{
        key: "componentDidMount",
        value: function componentDidMount() {
            this.margin = 0;
            this.minMargin = 0;
            this.memoizeSize();
        }
    },
    {
        key: "shouldComponentUpdate",
        value: function shouldComponentUpdate(nextProps, nextState) {
            let _thisprops = this.props,
                name = _thisprops.name,
                perLine = _thisprops.perLine,
                _native = _thisprops.native,
                hasStickyPosition = _thisprops.hasStickyPosition,
                emojis = _thisprops.emojis,
                emojiProps = _thisprops.emojiProps,
                skin = emojiProps.skin,
                size = emojiProps.size,
                set = emojiProps.set,
                nextPerLine = nextProps.perLine,
                nextNative = nextProps.native,
                nextHasStickyPosition = nextProps.hasStickyPosition,
                nextEmojis = nextProps.emojis,
                nextEmojiProps = nextProps.emojiProps,
                nextSkin = nextEmojiProps.skin,
                nextSize = nextEmojiProps.size,
                nextSet = nextEmojiProps.set,
                shouldUpdate = false;

            if (name == 'Recent' && perLine != nextPerLine) {
                shouldUpdate = true;
            }

            if (name == 'Search') {
                shouldUpdate = !(emojis == nextEmojis);
            }

            if (skin != nextSkin || size != nextSize || _native != nextNative || set != nextSet || hasStickyPosition != nextHasStickyPosition) {
                shouldUpdate = true;
            }

            return shouldUpdate;
        }
    },
    {
        key: "memoizeSize",
        value: function memoizeSize() {
            if (!this.container) {
                // probably this is a test environment, e.g. jest
                this.top = 0;
                this.maxMargin = 0;
                return;
            }

            let parent = this.container.parentElement;

            let _this$container$getBo = this.container.getBoundingClientRect(),
                top = _this$container$getBo.top,
                height = _this$container$getBo.height;

            let _parent$getBoundingCl = parent.getBoundingClientRect(),
                parentTop = _parent$getBoundingCl.top;

            let _this$label$getBoundi = this.label.getBoundingClientRect(),
                labelHeight = _this$label$getBoundi.height;

            this.top = top - parentTop + parent.scrollTop;

            if (height == 0) {
                this.maxMargin = 0;
            } else {
                this.maxMargin = height - labelHeight;
            }
        }
    },
    {
        key: "handleScroll",
        value: function handleScroll(scrollTop) {
            let margin = scrollTop - this.top;
            margin = margin < this.minMargin ? this.minMargin : margin;
            margin = margin > this.maxMargin ? this.maxMargin : margin;
            if (margin == this.margin) return;

            if (!this.props.hasStickyPosition) {
                this.label.style.top = "".concat(margin, "px");
            }

            this.margin = margin;
            return true;
        }
    },
    {
        key: "getEmojis",
        value: function getEmojis() {
            let _this2 = this;

            let _thisprops2 = this.props,
                name = _thisprops2.name,
                emojis = _thisprops2.emojis,
                recent = _thisprops2.recent,
                perLine = _thisprops2.perLine;

            if (name == 'Recent') {
                let custom = this.props.custom;

                let frequentlyUsed = recent || _frequently.get(perLine);

                if (frequentlyUsed.length) {
                    emojis = frequentlyUsed.map(function (id) {
                        let emoji = custom.filter(function (e) {
                            return e.id === id;
                        })[0];

                        if (emoji) {
                            return emoji;
                        }

                        return id;
                    }).filter(function (id) {
                        return !!(0, getData)(id, null, null, _this2.data);
                    });
                }

                if (emojis.length === 0 && frequentlyUsed.length > 0) {
                    return null;
                }
            }

            if (emojis) {
                emojis = emojis.slice(0);
            }

            return emojis;
        }
    },
    {
        key: "updateDisplay",
        value: function updateDisplay(display) {
            let emojis = this.getEmojis();

            if (!emojis || !this.container) {
                return;
            }

            this.container.style.display = display;
        }
    },
    {
        key: "setContainerRef",
        value: function setContainerRef(c) {
            this.container = c;
        }
    },
    {
        key: "setLabelRef",
        value: function setLabelRef(c) {
            this.label = c;
        }
    },
    {
        key: "render",
        value: function render() {
            let _this3 = this;

            let _thisprops3 = this.props,
                id = _thisprops3.id,
                name = _thisprops3.name,
                hasStickyPosition = _thisprops3.hasStickyPosition,
                emojiProps = _thisprops3.emojiProps,
                i18n = _thisprops3.i18n,
                notFound = _thisprops3.notFound,
                notFoundEmoji = _thisprops3.notFoundEmoji,
                emojis = this.getEmojis(),
                labelStyles = {},
                labelSpanStyles = {},
                containerStyles = {};

            if (!emojis) {
                containerStyles = {
                    display: 'none'
                };
            }

            if (!hasStickyPosition) {
                labelStyles = {
                    height: 28
                };
                labelSpanStyles = {
                    position: 'absolute'
                };
            }

            let label = i18n.categories[id] || name;
            return _element.createElement("section", {
                ref: this.setContainerRef,
                className: "cssprefix-mart-category",
                "aria-label": label,
                style: containerStyles
            }, _element.createElement("div", {
                style: labelStyles,
                "data-name": name,
                className: "cssprefix-mart-category-label"
            }, _element.createElement("span", {
                style: labelSpanStyles,
                ref: this.setLabelRef,
                "aria-hidden": true
                /* already labeled by the section aria-label */

            }, label)), _element.createElement("ul", {
                className: "cssprefix-mart-category-list"
            }, emojis && emojis.map(function (emoji) {
                return _element.createElement("li", {
                    key: emoji.short_names && emoji.short_names.join('_') || emoji
                }, (0, _nimbleEmoji())(objectSpread({
                    emoji: emoji,
                    data: _this3.data
                }, emojiProps)));
            })), emojis && !emojis.length && _element.createElement(_notFound, {
                i18n: i18n,
                notFound: notFound,
                notFoundEmoji: notFoundEmoji,
                data: this.data,
                emojiProps: emojiProps
            }));
        }
    }]);
    return Category;
}(_element.Component);



Category.defaultProps = {
    emojis: [],
    hasStickyPosition: true
};

export default Category;