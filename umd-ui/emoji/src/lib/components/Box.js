
import {assign as _extends} from "@aq-umd/core";
import dom from "@lib/components/DOM";
import element from "@lib/components/Element";
import createPicker from "@lib/components/Picker";
import _store from "@lib/components/EmojiStore";


class EmojBox extends element.Component {
    constructor(props) {
        super(props);
        this.userOption = _store.get("UserOption");
        this.state = this.userOption.state;
    }

    render() {
        const userOption = this.userOption;
        let _picker = createPicker();
        var picker = element.createElement(_picker,
            _extends({}, this.state, {
                //trả ra emoji đang select
                onSelect: function (data) {
                    typeof userOption.onSelect == "function" && userOption.onSelect({
                        id: data.id,
                        name: data.name,
                        unified: data.unified,
                        native: data.native
                    });
                }
            }
            ));

        return element.createElement("div", null,
            element.createElement("div", {
                className: userOption.class
            }, picker)
        );
    }

}

function createBox(container) {
    dom.render(element.createElement(EmojBox, null), container);
}

export default createBox;


