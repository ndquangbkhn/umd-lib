import { getResource } from "@core";
import _interopRequireWildcard from "@lib/components/RequireWildcard";
import { classCallCheck, createClass, possibleConstructorReturn } from "@lib/common/class";
import { getPrototypeOf, objectSpread } from "@lib/common/object";
import _inherits from "@lib/common/inherits";
import _element from "@lib/components/Element";
import _store from "@lib/components/EmojiStore";
import _frequently from "@lib/components/Frequently";
import { deepMerge, getSanitizedData, measureScrollbar } from "@lib/components/EmojiUtils";
import _data from "@lib/components/Data";
import _category from "@lib/components/Category";
import _anchors from "@lib/components/Anchors";
import _icons from "@lib/components/SearchIcons";
import _search from "@lib/components/Search";

import { getPickerDefaultProps } from "@lib/components/EmojiDefaultProps";

function createNimblePicker() {

    const I18N = getResource(_store.get("language"));

    const NimblePicker =
        function (param) {
            (0, _inherits)(NimblePicker, param);

            function NimblePicker(props) {
                var _this;

                (0, classCallCheck)(this, NimblePicker);
                _this = (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(NimblePicker).call(this, props));
                _this.CUSTOM = [];
                _this.RECENT_CATEGORY = {
                    id: 'recent',
                    name: 'Recent',
                    emojis: null
                };
                _this.SEARCH_CATEGORY = {
                    id: 'search',
                    name: 'Search',
                    emojis: null,
                    anchor: false
                };

                if (props.data.compressed) {
                    (0, _data.uncompress)(props.data);
                }

                _this.data = props.data;
                _this.i18n = (0, deepMerge)(I18N, props.i18n);
                _this.icons = (0, deepMerge)(_icons, props.icons);
                _this.state = {
                    firstRender: true
                };
                _this.categories = [];
                var allCategories = [].concat(_this.data.categories);

                if (props.custom.length > 0) {
                    var customCategories = {};
                    var customCategoriesCreated = 0;
                    props.custom.forEach(function (emoji) {
                        if (!customCategories[emoji.customCategory]) {
                            customCategories[emoji.customCategory] = {
                                id: emoji.customCategory ? "custom-".concat(emoji.customCategory) : 'custom',
                                name: emoji.customCategory || 'Custom',
                                emojis: [],
                                anchor: customCategoriesCreated === 0
                            };
                            customCategoriesCreated++;
                        }

                        var category = customCategories[emoji.customCategory];

                        var customEmoji = objectSpread({}, emoji, {
                            // `<Category />` expects emoji to have an `id`.
                            id: emoji.short_names[0],
                            custom: true
                        });

                        category.emojis.push(customEmoji);

                        _this.CUSTOM.push(customEmoji);
                    });
                    allCategories = allCategories.concat(Object.keys(customCategories).map(function (key) {
                        return customCategories[key];
                    }));
                }

                _this.hideRecent = true;

                if (props.include != undefined) {
                    allCategories.sort(function (a, b) {
                        if (props.include.indexOf(a.id) > props.include.indexOf(b.id)) {
                            return 1;
                        }

                        return -1;
                    });
                }

                for (var categoryIndex = 0; categoryIndex < allCategories.length; categoryIndex++) {
                    var category = allCategories[categoryIndex];
                    var isIncluded = props.include && props.include.length ? props.include.indexOf(category.id) > -1 : true;
                    var isExcluded = props.exclude && props.exclude.length ? props.exclude.indexOf(category.id) > -1 : false;

                    if (!isIncluded || isExcluded) {
                        continue;
                    }

                    if (props.emojisToShowFilter) {
                        var newEmojis = [];
                        var emojis = category.emojis;

                        for (var emojiIndex = 0; emojiIndex < emojis.length; emojiIndex++) {
                            var emoji = emojis[emojiIndex];

                            if (props.emojisToShowFilter(_this.data.emojis[emoji] || emoji)) {
                                newEmojis.push(emoji);
                            }
                        }

                        if (newEmojis.length) {
                            var newCategory = {
                                emojis: newEmojis,
                                name: category.name,
                                id: category.id
                            };

                            _this.categories.push(newCategory);
                        }
                    } else {
                        _this.categories.push(category);
                    }
                }

                var includeRecent = props.include && props.include.length ? props.include.indexOf(_this.RECENT_CATEGORY.id) > -1 : true;
                var excludeRecent = props.exclude && props.exclude.length ? props.exclude.indexOf(_this.RECENT_CATEGORY.id) > -1 : false;

                if (includeRecent && !excludeRecent) {
                    _this.hideRecent = false;

                    _this.categories.unshift(_this.RECENT_CATEGORY);
                }

                if (_this.categories[0]) {
                    _this.categories[0].first = true;
                }

                _this.categories.unshift(_this.SEARCH_CATEGORY);

                _this.setAnchorsRef = _this.setAnchorsRef.bind(_this);
                _this.handleAnchorClick = _this.handleAnchorClick.bind(_this);
                _this.setSearchRef = _this.setSearchRef.bind(_this);
                _this.handleSearch = _this.handleSearch.bind(_this);
                _this.setScrollRef = _this.setScrollRef.bind(_this);
                _this.handleScroll = _this.handleScroll.bind(_this);
                _this.handleScrollPaint = _this.handleScrollPaint.bind(_this);
                _this.handleEmojiClick = _this.handleEmojiClick.bind(_this);
                _this.handleEmojiSelect = _this.handleEmojiSelect.bind(_this);
                _this.handleSkinChange = _this.handleSkinChange.bind(_this);
                _this.handleKeyDown = _this.handleKeyDown.bind(_this);
                _this.handleDarkMatchMediaChange = _this.handleDarkMatchMediaChange.bind(_this);
                return _this;
            }

            (0, createClass)(NimblePicker, [{
                key: "componentDidMount",
                value: function componentDidMount() {
                    var _this2 = this;

                    if (this.state.firstRender) {
                        this.testStickyPosition();
                        this.firstRenderTimeout = setTimeout(function () {
                            _this2.setState({
                                firstRender: false
                            });
                        }, 60);
                    }
                }
            }, {
                key: "componentDidUpdate",
                value: function componentDidUpdate() {
                    this.updateCategoriesSize();
                    this.handleScroll();
                }
            }, {
                key: "componentWillUnmount",
                value: function componentWillUnmount() {
                    this.SEARCH_CATEGORY.emojis = null;
                    clearTimeout(this.leaveTimeout);
                    clearTimeout(this.firstRenderTimeout);

                    if (this.darkMatchMedia) {
                        this.darkMatchMedia.removeListener(this.handleDarkMatchMediaChange);
                    }
                }
            }, {
                key: "testStickyPosition",
                value: function testStickyPosition() {
                    var stickyTestElement = document.createElement('div');
                    var prefixes = ['', '-webkit-', '-ms-', '-moz-', '-o-'];
                    prefixes.forEach(function (prefix) {
                        return stickyTestElement.style.position = "".concat(prefix, "sticky");
                    });
                    this.hasStickyPosition = !!stickyTestElement.style.position.length;
                }
            }, {
                key: "getPreferredTheme",
                value: function getPreferredTheme() {
                    if (this.props.theme != 'auto') return this.props.theme;
                    if (this.state.theme) return this.state.theme;
                    if (typeof matchMedia !== 'function') return getPickerDefaultProps().theme;

                    if (!this.darkMatchMedia) {
                        this.darkMatchMedia = matchMedia('(prefers-color-scheme: dark)');
                        this.darkMatchMedia.addListener(this.handleDarkMatchMediaChange);
                    }

                    if (this.darkMatchMedia.media.match(/^not/)) return getPickerDefaultProps().theme;
                    return this.darkMatchMedia.matches ? 'dark' : 'light';
                }
            }, {
                key: "handleDarkMatchMediaChange",
                value: function handleDarkMatchMediaChange() {
                    this.setState({
                        theme: this.darkMatchMedia.matches ? 'dark' : 'light'
                    });
                }
            }, {
                key: "handleEmojiClick",
                value: function handleEmojiClick(emoji, e) {
                    this.props.onClick(emoji, e);
                    this.handleEmojiSelect(emoji);
                }
            }, {
                key: "handleEmojiSelect",
                value: function handleEmojiSelect(emoji) {
                    var _this3 = this;

                    this.props.onSelect(emoji);
                    if (!this.hideRecent && !this.props.recent) _frequently.add(emoji);
                    var component = this.categoryRefs['category-1'];

                    if (component) {
                        var maxMargin = component.maxMargin;

                        if (this.props.enableFrequentEmojiSort) {
                            component.forceUpdate();
                        }

                        requestAnimationFrame(function () {
                            if (!_this3.scroll) return;
                            component.memoizeSize();
                            if (maxMargin == component.maxMargin) return;

                            _this3.updateCategoriesSize();

                            _this3.handleScrollPaint();

                            if (_this3.SEARCH_CATEGORY.emojis) {
                                component.updateDisplay('none');
                            }
                        });
                    }
                }
            }, {
                key: "handleScroll",
                value: function handleScroll() {
                    if (!this.waitingForPaint) {
                        this.waitingForPaint = true;
                        requestAnimationFrame(this.handleScrollPaint);
                    }
                }
            }, {
                key: "handleScrollPaint",
                value: function handleScrollPaint() {
                    this.waitingForPaint = false;

                    if (!this.scroll) {
                        return;
                    }

                    var activeCategory = null;

                    if (this.SEARCH_CATEGORY.emojis) {
                        activeCategory = this.SEARCH_CATEGORY;
                    } else {
                        var target = this.scroll,
                            scrollTop = target.scrollTop,
                            scrollingDown = scrollTop > (this.scrollTop || 0),
                            minTop = 0;

                        for (var i = 0, l = this.categories.length; i < l; i++) {
                            var ii = scrollingDown ? this.categories.length - 1 - i : i,
                                category = this.categories[ii],
                                component = this.categoryRefs["category-".concat(ii)];

                            if (component) {
                                var active = component.handleScroll(scrollTop);

                                if (!minTop || component.top < minTop) {
                                    if (component.top > 0) {
                                        minTop = component.top;
                                    }
                                }

                                if (active && !activeCategory) {
                                    activeCategory = category;
                                }
                            }
                        }

                        if (scrollTop < minTop) {
                            activeCategory = this.categories.filter(function (category) {
                                return !(category.anchor === false);
                            })[0];
                        } else if (scrollTop + this.clientHeight >= this.scrollHeight) {
                            activeCategory = this.categories[this.categories.length - 1];
                        }
                    }

                    if (activeCategory) {
                        var anchors = this.anchors,
                            _activeCategory = activeCategory,
                            categoryName = _activeCategory.name;

                        if (anchors.state.selected != categoryName) {
                            anchors.setState({
                                selected: categoryName
                            });
                        }
                    }

                    this.scrollTop = scrollTop;
                }
            }, {
                key: "handleSearch",
                value: function handleSearch(emojis) {
                    this.SEARCH_CATEGORY.emojis = emojis;

                    for (var i = 0, l = this.categories.length; i < l; i++) {
                        var component = this.categoryRefs["category-".concat(i)];

                        if (component && component.props.name != 'Search') {
                            var display = emojis ? 'none' : 'inherit';
                            component.updateDisplay(display);
                        }
                    }

                    this.forceUpdate();

                    if (this.scroll) {
                        this.scroll.scrollTop = 0;
                    }

                    this.handleScroll();
                }
            }, {
                key: "handleAnchorClick",
                value: function handleAnchorClick(category, i) {
                    var component = this.categoryRefs["category-".concat(i)],
                        scroll = this.scroll,
                        anchors = this.anchors,
                        scrollToComponent = null;

                    scrollToComponent = function scrollToComponent() {
                        if (component) {
                            var top = component.top;

                            if (category.first) {
                                top = 0;
                            } else {
                                top += 1;
                            }

                            scroll.scrollTop = top;
                        }
                    };

                    if (this.SEARCH_CATEGORY.emojis) {
                        this.handleSearch(null);
                        this.search.clear();
                        requestAnimationFrame(scrollToComponent);
                    } else {
                        scrollToComponent();
                    }
                }
            }, {
                key: "handleSkinChange",
                value: function handleSkinChange(skin) {
                    var newState = {
                        skin: skin
                    },
                        onSkinChange = this.props.onSkinChange;
                    this.setState(newState);

                    _store.update(newState);

                    onSkinChange(skin);
                }
            }, {
                key: "handleKeyDown",
                value: function handleKeyDown(e) {
                    var handled = false;

                    switch (e.keyCode) {
                        case 13:
                            var emoji;

                            if (this.SEARCH_CATEGORY.emojis && this.SEARCH_CATEGORY.emojis.length && (emoji = (0, getSanitizedData)(this.SEARCH_CATEGORY.emojis[0], this.state.skin, this.props.set, this.props.data))) {
                                this.handleEmojiSelect(emoji);
                                handled = true;
                            }

                            break;
                    }

                    if (handled) {
                        e.preventDefault();
                    }
                }
            }, {
                key: "updateCategoriesSize",
                value: function updateCategoriesSize() {
                    for (var i = 0, l = this.categories.length; i < l; i++) {
                        var component = this.categoryRefs["category-".concat(i)];
                        if (component) component.memoizeSize();
                    }

                    if (this.scroll) {
                        var target = this.scroll;
                        this.scrollHeight = target.scrollHeight;
                        this.clientHeight = target.clientHeight;
                    }
                }
            }, {
                key: "getCategories",
                value: function getCategories() {
                    return this.state.firstRender ? this.categories.slice(0, 3) : this.categories;
                }
            }, {
                key: "setAnchorsRef",
                value: function setAnchorsRef(c) {
                    this.anchors = c;
                }
            }, {
                key: "setSearchRef",
                value: function setSearchRef(c) {
                    this.search = c;
                }
            }, {
                key: "setScrollRef",
                value: function setScrollRef(c) {
                    this.scroll = c;
                }
            }, {
                key: "setCategoryRef",
                value: function setCategoryRef(name, c) {
                    if (!this.categoryRefs) {
                        this.categoryRefs = {};
                    }

                    this.categoryRefs[name] = c;
                }
            }, {
                key: "render",
                value: function render() {
                    var _this4 = this;

                    var _this$props = this.props,
                        perLine = _this$props.perLine,
                        emojiSize = _this$props.emojiSize,
                        set = _this$props.set,
                        sheetSize = _this$props.sheetSize,
                        sheetColumns = _this$props.sheetColumns,
                        sheetRows = _this$props.sheetRows,
                        style = _this$props.style,
                        title = _this$props.title,
                        emoji = _this$props.emoji,
                        color = _this$props.color,
                        _native = _this$props["native"],
                        emojisToShowFilter = _this$props.emojisToShowFilter,
                        emojiTooltip = _this$props.emojiTooltip,
                        useButton = _this$props.useButton,
                        include = _this$props.include,
                        exclude = _this$props.exclude,
                        recent = _this$props.recent,
                        autoFocus = _this$props.autoFocus,
                        notFound = _this$props.notFound,
                        notFoundEmoji = _this$props.notFoundEmoji;
                    var width = perLine * (emojiSize + 12) + 12 + 2 + (0, measureScrollbar)();
                    var theme = this.getPreferredTheme();
                    var skin = this.props.defaultSkin;
                    return _element.createElement("section", {
                        style: objectSpread({
                            width: width
                        }, style),
                        className: "cssprefix-mart cssprefix-mart-".concat(theme),
                        "aria-label": title,
                        onKeyDown: this.handleKeyDown
                    }, _element.createElement("div", {
                        className: "cssprefix-mart-bar"
                    }, _element.createElement(_anchors, {
                        ref: this.setAnchorsRef,
                        data: this.data,
                        i18n: this.i18n,
                        color: color,
                        categories: this.categories,
                        onAnchorClick: this.handleAnchorClick,
                        icons: this.icons
                    })), _element.createElement(_search, {
                        ref: this.setSearchRef,
                        onSearch: this.handleSearch,
                        data: this.data,
                        i18n: this.i18n,
                        emojisToShowFilter: emojisToShowFilter,
                        include: include,
                        exclude: exclude,
                        custom: this.CUSTOM,
                        autoFocus: autoFocus
                    }), _element.createElement("div", {
                        ref: this.setScrollRef,
                        className: "cssprefix-mart-scroll cssprefix-scroll",
                        onScroll: this.handleScroll
                    }, this.getCategories().map(function (category, i) {
                        return _element.createElement(_category, {
                            ref: _this4.setCategoryRef.bind(_this4, "category-".concat(i)),
                            key: category.name,
                            id: category.id,
                            name: category.name,
                            emojis: category.emojis,
                            perLine: perLine,
                            "native": _native,
                            hasStickyPosition: _this4.hasStickyPosition,
                            data: _this4.data,
                            i18n: _this4.i18n,
                            recent: category.id == _this4.RECENT_CATEGORY.id ? recent : undefined,
                            custom: category.id == _this4.RECENT_CATEGORY.id ? _this4.CUSTOM : undefined,
                            emojiProps: {
                                "native": _native,
                                skin: skin,
                                size: emojiSize,
                                set: set,
                                sheetSize: sheetSize,
                                sheetColumns: sheetColumns,
                                sheetRows: sheetRows,
                                forceSize: _native,
                                tooltip: emojiTooltip,
                                useButton: useButton,
                                onOver: _this4.handleEmojiOver,
                                onLeave: _this4.handleEmojiLeave,
                                onClick: _this4.handleEmojiClick
                            },
                            notFound: notFound,
                            notFoundEmoji: notFoundEmoji
                        });
                    })));
                }
            }]);
            return NimblePicker;
        }(_element.PureComponent);



    NimblePicker.defaultProps = objectSpread({}, getPickerDefaultProps());

    return NimblePicker;
}
export default createNimblePicker;
