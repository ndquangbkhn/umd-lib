
import _interopRequireWildcard from "@lib/components/RequireWildcard";
import { classCallCheck, createClass, possibleConstructorReturn } from "@lib/common/class";
import { getPrototypeOf, objectSpread } from "@lib/common/object";
import _inherits from "@lib/common/inherits";
import _element from "@lib/components/Element";
import _store from "@lib/components/EmojiStore";
import _frequently from "@lib/components/Frequently";
import _data from "@lib/components/Data";
import _anchors from "@lib/components/Anchors";
import _nimbleEmoji from "@lib/components/NimbleEmoji";
import _search from "@lib/components/Search";


const NotFound = function (param) {
    (0, _inherits)(NotFound, param);

    function NotFound() {
        (0, classCallCheck)(this, NotFound);
        return (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(NotFound).apply(this, arguments));
    }

    (0, createClass)(NotFound, [{
        key: "render",
        value: function render() {
            var _this$props = this.props,
                data = _this$props.data,
                emojiProps = _this$props.emojiProps,
                i18n = _this$props.i18n,
                notFound = _this$props.notFound,
                notFoundEmoji = _this$props.notFoundEmoji;

            var component = notFound && notFound() || _element.createElement("div", {
                className: "cssprefix-mart-no-results"
            }, (0, _nimbleEmoji())(objectSpread({
                data: data
            }, emojiProps, {
                size: 38,
                emoji: notFoundEmoji,
                onOver: null,
                onLeave: null,
                onClick: null
            })), _element.createElement("div", {
                className: "cssprefix-mart-no-results-label"
            }, i18n.notfound));

            return component;
        }
    }]);
    return NotFound;
}(_element.PureComponent);

export default NotFound;
