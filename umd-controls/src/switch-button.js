import './switch-button.css';
import _TEMPLATE_ from './switch-button.html?raw';
import { DOMClass } from '@misa-umd/core';

class SwitchButton extends DOMClass {

    constructor(container, options = {}) {
        super(container, options);
        this.data = this.options.data;
        this.doRender();
    }

    _items = [];

    override = {
        template: _TEMPLATE_,
        resource: null,
        created() {
            this.element.setAttribute("value", this.options.value);

        },
        mounted: () => {

        },
        unmounted() {

        },
        click: {
            "element": function (e) {
                if (this.isOn()) {
                    this.setOff();
                } else {
                    this.setOn();
                }
                typeof this.options.onChange == "function" && this.options.onChange.call(this, this.isOn());
            }
        },
        scroll: {

        },
        keyboard: {

        }
    };

    isOn() {
        let mode = this.element.getAttribute("mode");
        return mode === "on";
    };

    setOn() {
        this.element.setAttribute("mode", "on");
    };
    setOff() {
        this.element.setAttribute("mode", "off");
    };

    getValue() {
        return this.options.value;
    };

}

// Xuất class Button
export default SwitchButton;

