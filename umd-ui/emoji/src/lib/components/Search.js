import { classCallCheck, createClass, possibleConstructorReturn } from "@lib/common/class";
import { getPrototypeOf } from "@lib/common/object";
import _element from "@lib/components/Element";
import _nimbleEmojiIndex from "@lib/components/NimbleEmojiIndex";
import _svgs from "@lib/components/SearchIcons";
import { throttleIdleTask } from "@lib/components/EmojiUtils";
import _inherits from "@lib/common/inherits";
let id = 0;

const Search =
    function (_rp) {
        (0, _inherits)(Search, _rp);

        function Search(props) {
            let _this;

            (0, classCallCheck)(this, Search);
            _this = (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(Search).call(this, props));
            _this.state = {
                icon: _svgs.search.search,
                isSearching: false,
                id: ++id
            };
            _this.data = props.data;
            _this.emojiIndex = new _nimbleEmojiIndex(_this.data);
            _this.setRef = _this.setRef.bind(_this);
            _this.clear = _this.clear.bind(_this);
            _this.handleKeyUp = _this.handleKeyUp.bind(_this);

            _this.handleChange = (0, throttleIdleTask)(_this.handleChange.bind(_this));
            return _this;
        }

        (0, createClass)(Search, [{
            key: "componentDidMount",
            value: function componentDidMount() {
                if (this.input && this.input.value) {
                    this.search(this.input.value);
                }
            }
        }, {
            key: "search",
            value: function search(value) {
                if (value == '') this.setState({
                    icon: _svgs.search.search,
                    isSearching: false
                }); else this.setState({
                    icon: _svgs.search["delete"],
                    isSearching: true
                });
                this.props.onSearch(this.emojiIndex.search(value, {
                    emojisToShowFilter: this.props.emojisToShowFilter,
                    maxResults: this.props.maxResults,
                    include: this.props.include,
                    exclude: this.props.exclude,
                    custom: this.props.custom
                }));
            }
        }, {
            key: "clear",
            value: function clear() {
                if (this.input.value == '') return;
                this.input.value = '';
                this.input.focus();
                this.search('');
            }
        }, {
            key: "handleChange",
            value: function handleChange() {
                this.search(this.input.value);
            }
        }, {
            key: "handleKeyUp",
            value: function handleKeyUp(e) {
                if (e.keyCode === 13) {
                    this.clear();
                }
            }
        }, {
            key: "setRef",
            value: function setRef(c) {
                this.input = c;
            }
        }, {
            key: "render",
            value: function render() {
                let _this$props = this.props,
                    i18n = _this$props.i18n,
                    autoFocus = _this$props.autoFocus;
                let _this$state = this.state,
                    icon = _this$state.icon,
                    isSearching = _this$state.isSearching,
                    id = _this$state.id;
                let inputId = "cssprefix-mart-search-".concat(id);
                return _element.createElement("section", {
                    className: "cssprefix-mart-search",
                    "aria-label": i18n.search
                }, _element.createElement("input", {
                    id: inputId,
                    ref: this.setRef,
                    type: "search",
                    onChange: this.handleChange,
                    placeholder: i18n.search,
                    autoFocus: autoFocus
                }), _element.createElement("label", {
                    className: "cssprefix-mart-sr-only",
                    htmlFor: inputId
                }, i18n.search), _element.createElement("button", {
                    className: "cssprefix-mart-search-icon",
                    onClick: this.clear,
                    onKeyUp: this.handleKeyUp,
                    "aria-label": i18n.clear,
                    disabled: !isSearching
                }, icon()));
            }
        }]);
        return Search;
    }(_element.PureComponent);



Search.defaultProps = {
    onSearch: function onSearch() { },
    maxResults: 75,
    emojisToShowFilter: null,
    autoFocus: false
};

export default Search;