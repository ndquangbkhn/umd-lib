import { classCallCheck, createClass, possibleConstructorReturn } from "@lib/common/class";
import { getPrototypeOf, objectSpread } from "@lib/common/object";
import _inherits2 from "@lib/common/inherits";
import _element from "@lib/components/Element";
import { getPickerDefaultProps } from "@lib/components/EmojiDefaultProps";
import createNimblePicker from "@lib/components/NimblePicker";
import { assign as _extendsFn } from "@aq-umd/core";

import _all from "@data/data";

function createPicker() {
    var Picker =
        function (rpComponent) {
            (0, _inherits2)(Picker, rpComponent);

            function Picker() {
                (0, classCallCheck)(this, Picker);
                return (0, possibleConstructorReturn)(this, (0, getPrototypeOf)(Picker).apply(this, arguments));
            }

            (0, createClass)(Picker, [{
                key: "render",
                value: function render() {
                    let _nimblePicker = createNimblePicker();
                    return _element.createElement(_nimblePicker, (0, _extendsFn)({}, this.props, this.state));
                }
            }]);
            return Picker;
        }(_element.PureComponent);


    Picker.defaultProps = objectSpread({}, getPickerDefaultProps(), {
        data: _all
    });

    return Picker;

}

export default createPicker;