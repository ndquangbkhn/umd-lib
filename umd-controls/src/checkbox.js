import './checkbox.css';
import _TEMPLATE_ from './checkbox.html?raw';
import { isFn, DOMUtil, DOMClass } from '@misa-umd/core';


class CheckBox extends DOMClass {

    checked = false;

    override = {
        template: _TEMPLATE_,
        resource: null,
        created() {
            this.input = this.element.querySelector("input");
            this.setLabel(this.options.label);
            DOMUtil.attr(this.input, {
                name: this.options.name,
                value: this.options.value
            });
        },
        mounted: () => {
            this.setChecked(this.options.checked);
            let onChanged = (e) => {
                console.log("changed");
                let checked = this.input.checked;
                this.checked = checked;
                if (isFn(this.events.afterChange)) {
                    this.fireEvent("changed", e, checked);
                }
            };
            this.input.addEventListener('change', onChanged);
        },
        unmounted(){
            console.log("unmounted");
        },
        click: {
            ".cssprefix-checkmark": (e, el) => { 
                console.log("click checkmark");
            },
            "element": this.onElementClick
        },
        scroll:{
            
        },
        keyboard: {
            "element": {
                onEnter: (target, code, e) => {
                    console.log("Element Enter");
                },
                onESC: (target, code, e) => {
                    console.log("Element ESC");
                }
            }
        }
    };

    onElementClick(e, el) {
        DOMUtil.stopEvent(e);
        console.log("click checkmark");
        this.fireEvent("click", e);
        this.input.checked = !this.input.checked;
        this.input.dispatchEvent(new Event('change'));
    }


    setChecked(checked) {
        this.input.checked = !!checked;
        this.checked = !!checked;
    }

    setLabel(label) {
        DOMUtil.html(this.element.querySelector(".cssprefix-caption"), label);
    }

}

// Xuất class Button
export default CheckBox;

