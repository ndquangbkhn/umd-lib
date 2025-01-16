import './selectbox.css';
import _TEMPLATE_ from './selectbox.html?raw';
import { DOMUtil, DOMClass, isValue } from '@misa-umd/core';

class SelectBox extends DOMClass {

    constructor(container, options = {}) {
        super(container, options);
        this.mergeOptions({
            data: [
                //{
                //    Value: "0",
                //    Display: "Option 1",
                //    Fixed: true
                //    Data:""
                //},
                //{
                //    Value: "1",
                //    Display: "Option 2"
                //}
            ],
            defaultValue: null,
            type: "radio", // "radio || checkbox
            multiSelect: false,
            valueField: "Value",
            displayField: "Display",
            groupName: (new Date()).getTime().toString(),
            direction: "vertical", // vertical

        });

        this.data = this.options.data;
    }

    _items = [];

    override = {
        template: _TEMPLATE_,
        resource: null,
        created() {
            let dir = this.options.direction, cls = '', margin = "0";
            let itemWidth = 0;
            if (dir === "table") {
                cls = "table";
                var col = this.options.column || 1;
                itemWidth = Math.round(100 / col);
                if (itemWidth > Math.round(100 / col)) itemWidth = itemWidth - 1;
                DOMUtil.css(this.element, {
                    "display": "flex",
                    "flex-wrap": "wrap",
                    "width": "100%"
                });

            } else if (dir === "horizontal") {
                cls = "horizontal";
                margin = this.options.margin || "24px";
            } else {
                cls = "vertical";
            }

            DOMUtil.addClass(this.element, cls);

            if (this.data.length > 0) {
                var optionData = this.data.map((d) => {
                    let m = {
                        Value: d[this.options.valueField || "Value"],
                        Display: d[this.options.displayField || "Display"],
                        Data: d
                    };
                    if (isValue(d.Fixed)) {
                        m.Fixed = !!d.Fixed;
                    }

                    return m;
                });
                const defaultValue = this.options.defaultValue || "0";

                for (let i = 0; i < optionData.length; i++) {
                    const op = optionData[i];
                    const item = this.createOptionItem(op);
                    if (itemWidth > 0) {
                        DOMUtil.css(item, "width", itemWidth + "%");

                    }

                    this._items.push(item);
                    this.element.append(item);

                    //Nếu xếp theo chiều ngang thì thêm khoảng trắng vào
                    if (dir === "horizontal" && i < optionData.length - 1) {
                        let spaceEl = DOMUtil.fromTemplate("<div style='width: " + margin + "'></div>");
                        DOMUtil.append(this.element, spaceEl);
                    }
                }
                this.setValue(defaultValue);
            }
        },
        mounted: () => {
            if (this._items.length > 0) {
                //Gắn sự kiện check change cho ô check chọn
                this._items.forEach((item) => {
                    DOMUtil.onEvent(item.input, "change", (e) => {
                        console.log("change");
                        this.onItemCheckChange(e, item);
                    });
                });
            }
        },
        unmounted() {
            console.log("unmounted");
        },
        click: {

        },
        scroll: {

        },
        keyboard: {
            // "element": {
            //     onEnter: (target, code, e) => {
            //         console.log("Element Enter");
            //     },
            //     onESC: (target, code, e) => {
            //         console.log("Element ESC");
            //     }
            // }
        }
    };

    onItemCheckChange(e, item) {
        item.checked = item.input.checked;
        //Nếu không phải chọn nhiều và nếu check true thì bỏ check các item khác
        if (!this.options.multiSelect && item.checked) {
            this._items.forEach((it) => {
                if (it.Value !== item.Value) {
                    //Set lại checked= fasle cho những cái còn lại 
                    this.setChecked(it, false);
                }
            });
        }

        this.fireEvent("change", e, item, item.checked, item.Value, this);

    }

    createOptionItem(op) {
        let type = this.options.type;
        let lablClass = "cssprefix-checkbox";
        let groupName = "";
        if (this.options.type === "radio") {
            type = type;
            lablClass = "cssprefix-radio";
            groupName = this.options.groupName;
        }


        let item = DOMUtil.createDIV("cssprefix-selectbox-item");
        let label = DOMUtil.create("label", lablClass);


        let input = DOMUtil.create("input", "", {
            "name": groupName,
            "type": type
        });

        let spanCheck = DOMUtil.create("span", "checkmark");
        let spanCaption = DOMUtil.create("span", "caption cssprefix-ellipsis");
        DOMUtil.text(spanCaption, op.Display);

        label.appendChild(input);
        label.appendChild(spanCheck);
        label.appendChild(spanCaption);
        item.appendChild(label);


        DOMUtil.attr(item, "title", op.Display);
        item.Value = op.Value;
        item.checked = input.checked;

        if (isValue(op.Fixed)) {
            DOMUtil.addClass(item, "fixed");
            this.setChecked(item, !!op.Fixed);
            DOMUtil.attr(input, {
                "readonly": "readonly",
                "disabled": "disabled"
            }).addClass(input, "disable");
            item.isFixed = true;
        }

        item.Data = op.Data;

        item.input = input;
        return item;
    }

    setChecked(item, checked) {
        if (!item.isFixed) {
            item.checked = checked;
            item.input.checked = checked;
        }
    };

    setValue(values) {
        var arr = [];
        if (Array.isArray(values)) {
            arr = values;
        } else if (typeof values === "string") {
            arr = values.split(",");
        } else {
            arr.push(values);
        }

        if (Array.isArray(arr) && arr.length > 0) {
            if (!this.options.multiSelect) {
                this._items.forEach((item) => {
                    if (item.Value == arr[0]) {
                        this.setChecked(item, true);
                    } else {
                        this.setChecked(item, false);
                    }
                });

            } else if (this.options.multiSelect) {
                this._items.forEach((item) => {
                    let find = arr.filter(function (val) {
                        return val === item.Value;
                    });
                    if (find.length > 0) {
                        this.setChecked(item, true);
                    } else {
                        this.setChecked(item, false);
                    }

                });

            }
        } else {
            this._items.forEach((item) => {
                this.setChecked(item, false);
            });
        }
    }

    setSelectedItems() {
        if (this._items.length > 0) {
            //Gắn sự kiện check change cho ô check chọn
            let selected = [];

            this._items.forEach(function (item) {
                if (item.checked) {
                    selected.push(item);
                }
            });
            if (!this.options.multiSelect) {
                return selected.length > 0 ? selected[0] : null;
            } else {
                return selected;
            }

        } else {
            return null;
        }
    }

    getSelectedData() {
        if (this._items.length > 0) {
            let selected = [];

            this._items.forEach(function (item) {
                if (item.checked) {
                    selected.push(item.Data);
                }
            });
            if (!this.options.multiSelect) {
                return selected.length > 0 ? selected[0] : null;
            } else {
                return selected;
            }

        } else {
            return null;
        }
    }

    getValue = function (sp) {
        sp = isValue(sp) ? sp : ",";
        if (this._items.length > 0) {
            //Gắn sự kiện check change cho ô check chọn
            const values = [];

            this._items.forEach((item) => {
                if (item.checked) {
                    values.push(item.Value);
                }
            });
            if (this.options.multiSelect) {
                return values.join(sp);
            } else {
                return values.length == 1 ? values[0] : null;
            }

        } else {
            return null;
        }
    }

    getValueArray() {
        if (this._items.length > 0) {
            const values = [];
            this._items.forEach((item) => {
                if (item.checked) {
                    values.push(item.Value);
                }
            });

            return values;

        } else {
            return [];
        }
    }

    getData() {
        const data = {};
        this._items.forEach((item) => {
            data[item.Value] = !!item.checked;
        });

        return data;
    }

}

// Xuất class Button
export default SelectBox;

