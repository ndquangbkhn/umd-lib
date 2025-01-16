import { classCallCheck, createClass, possibleConstructorReturn } from "@lib/common/class";
import { getPrototypeOf } from "@lib/common/object";
import _inherits from "@lib/common/inherits";
import _element from "@lib/components/Element";


 

var Anchors = function (param) {
    (0, _inherits)(Anchors, param);

    function Anchors(props) {
        var _this;

        classCallCheck(this, Anchors);
        _this = (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(Anchors).call(this, props));
        var defaultCategory = props.categories.filter(function (category) {
            return category.first;
        })[0];
        _this.state = {
            selected: defaultCategory.name
        };
        _this.handleClick = _this.handleClick.bind(_this);
        return _this;
    }

    (0, createClass)(Anchors, [{
        key: "handleClick",
        value: function handleClick(e) {
            var index = e.currentTarget.getAttribute('data-index');
            var _this$props = this.props,
                categories = _this$props.categories,
                onAnchorClick = _this$props.onAnchorClick;
            onAnchorClick(categories[index], index);
        }
    }, {
        key: "render",
        value: function render() {
            var _this2 = this;

            var _this$props2 = this.props,
                categories = _this$props2.categories,
                color = _this$props2.color,
                i18n = _this$props2.i18n,
                icons = _this$props2.icons,
                selected = this.state.selected;
            return _element.createElement("nav", {
                className: "cssprefix-mart-anchors",
                "aria-label": i18n.categorieslabel
            }, categories.map(function (category, i) {
                var id = category.id,
                    name = category.name,
                    anchor = category.anchor,
                    isSelected = name == selected;

                if (anchor === false) {
                    return null;
                }

                var iconId = id.startsWith('custom-') ? 'custom' : id;
                var tab = _element.createElement("button", {
                    key: id,
                    "aria-label": i18n.categories[id],
                    title: i18n.categories[id],
                    "data-index": i,
                    type: 'button',
                    onClick: _this2.handleClick,
                    className: "cssprefix-mart-anchor ".concat(isSelected ? 'cssprefix-mart-anchor-selected' : ''),
                    style: {
                        color: isSelected ? color : null
                    }
                }, _element.createElement("div", {
                    className: "cssprefix-mart-anchor-icon"
                }, icons.categories[iconId]()), _element.createElement("span", {
                    className: "cssprefix-mart-anchor-bar",
                    style: {
                        backgroundColor: color
                    }
                }));

                return tab;
            }));
        }
    }]);
    return Anchors;
}(_element.PureComponent);


Anchors.defaultProps = {
    categories: [],
    onAnchorClick: function onAnchorClick() { },
    icons: {}
};

export default Anchors;