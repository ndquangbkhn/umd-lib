import _common from './customscroll';
import './combobox.css';
import _TEMPLATE_ from './combobox.html?raw';

import { isFn,isValue, formatData, DOMUtil, DOMClass, isCharacterKeyPress, smoothScrollToTarget } from '@aq-umd/core';

class Combobox extends DOMClass {

    constructor(container, options = {}) {
        super(container, options);
        this.mergeOptions({
            css: {},
            valueField: "Value",
            displayField: "Display",
            displayTmpl: "",
            emptyText: "",
            noDataText: "No data",
            clearText: "- Remove selected -",
            showClearItem: false,
            menuCss: {},
            search: true,
            data: []
        });
        this.options.displayField = this.options.displayField || "Display";
        this.options.valueField = this.options.valueField || "Value";
        this.displayTmpl = this.options.displayTmpl || "{#" + this.options.displayField + "#}";

        this.data = this.options.data;
        this.show();
    }

    _items = [];

    override = {
        template: _TEMPLATE_,
        resource: null,
        created() {
            console.log("created");
            if (this.options.search == true) {
                this.input = DOMUtil.fromTemplate('<input type="text" class="cssprefix-combobox-input" />');
                DOMUtil.attr(this.input, "placeholder", this.options.emptyText);
                DOMUtil.onEvent(this.input, "blur", this.afterEdit.bind(this));
            } else {
                this.input = DOMUtil.fromTemplate("<div type='text' class='cssprefix-combobox-input'></div>");
            }
            if (this.options.class) {
                DOMUtil.addClass(this.input, this.options.class);
            }

            DOMUtil.prepend(this.element, this.input);
            if (this.options.css) {
                DOMUtil.css(this.input, this.options.css);
            }
            if (this.options.height) {
                DOMUtil.css(this.element, {
                    "height": this.options.height
                });
                DOMUtil.css.css(this.input, {
                    "height": this.options.height
                });
            }

            if (this.options.menuCss) {
                DOMUtil.css(this.els.menuEl, this.options.menuCss);
            }

            if (this.options.emptyText) {
                DOMUtil.html(this.els.menuEl, ["<div style='color:#9e9e9e'>", this.options.emptyText, "</div>"].join(""));
            }

            this.renderMenu(this.options.data);
        },
        mounted: () => {
            DOMUtil.onClick(document.body, this.onBodyClick.bind(this));
        },
        unmounted() {
            DOMUtil.removeEvent(document.body, "click", this.onBodyClick.bind(this));
        },
        click: {
            ".cssprefix-combobox-input": (e, target) => {
                if (this.isDisable) {
                    DOMUtil.stopEvent(e);
                } else {
                    if (!this.els.menuEl.contains(target)) {
                        if (DOMUtil.isVisible(this.els.menuEl)) {
                            this.hideMenu();
                        } else {
                            this.showMenu(true);
                        }
                    }
                }


            },
            ".cssprefix-combobox-item": (e, target) => {
                DOMUtil.stopEvent(e);
                this.setSelectedItem(target);
                this.selectedRecord = target.data;
                this.setValue(this.selectedRecord[this.options.valueField]);

                //Gọi về hàm xử lý khi click item truyền vào từ options
                this.fireEvent("item-selected", e, target, this.selectedRecord, this);

                //Sau khi chọn ẩn menu
                this.hideMenu();
            },
            ".cssprefix-combobox-menu-clear": (e, target) => {
                this.setValue(null);
                this.hideMenu();
            }
        },
        scroll: {

        },
        keyboard: {
            "input.cssprefix-combobox-input": {
                onKeyDown: (target, code, e) => {
                    this.onKeyDown(target, code, e);
                },
                onKeyUp: (target, code, e) => {
                    this.onKeyUp(target, code, e);
                }
            }
        }
    };

    onBodyClick(e) {
        let target = e.target;
        if (!this.els.menuEl.contains(target) && !this.input.contains(target)) {
            this.hideMenu();
        }
    }

    renderMenu(data) {
        DOMUtil.empty(this.els.menuEl);
        this.listItems = [];
        if (this.options.menuTitle) {
            let item = DOMUtil.fromTemplate('<div  class="cssprefix-combobox-menu-title">' + this.options.menuTitle + '</div>');
            DOMUtil.append(this.els.menuEl, item);
        }
        if (this.options.showClearItem) {
            let item = DOMUtil.fromTemplate('<div  class="cssprefix-combobox-menu-clear">' + this.options.clearText + '</div>');
            DOMUtil.append(this.els.menuEl, item);
        }
        this.els.menuElItem = {};

        if (data && data.length > 0) {

            for (var i = 0; i < data.length; i++) {

                var selectedData = data[i];
                var item = this.getItem(selectedData);

                item.data = selectedData;
                item.value = selectedData[this.options.valueField];
                this.els.menuElItem[selectedData[this.options.valueField]] = item;
                //Xử lý khi click vào item
                if (selectedData.IsTitle) {
                    DOMUtil.addClass(item, "cssprefix-combobox-item-title");
                }
                //Gắn item vào menu
                DOMUtil.append(this.els.menuEl, item);
                this.listItems.push(item);
            }
        } else {

            this.els.menuEl.html("<div class='cssprefix-combobox-empty'>" + this.options.noDataText + "</div>");
        }

        //Ẩn menu
        this.hideMenu();
    }



    setPrevItem() {
        let visibleItems = this.listItems.filter((it) => {
            return DOMUtil.isVisible(it);
        });

        if (!this.selectedItem || !DOMUtil.isVisible(this.selectedItem)) {
            this.selectedItem = visibleItems[0];
        } else {
            let currPos = visibleItems.indexOf(this.selectedItem);
            let prevPos = currPos > 0 ? currPos - 1 : visibleItems.length - 1;
            this.selectedItem = visibleItems[prevPos];
        }

        this.setSelectedItem(this.selectedItem);
    }

    setNextItem() {
        let visibleItems = this.listItems.filter((it) => {
            return DOMUtil.isVisible(it);
        });
        if (!this.selectedItem || !DOMUtil.isVisible(this.selectedItem)) {
            this.selectedItem = visibleItems[0];
        } else {
            let currPos = visibleItems.indexOf(this.selectedItem);
            let prevPos = currPos < visibleItems.length - 1 ? currPos + 1 : 0;
            this.selectedItem = visibleItems[prevPos];
        }
        this.setSelectedItem(this.selectedItem);
    }


    onKeyDown(target, code, e) {
        if (code == 38 || code == 40) {
            if (DOMUtil.isVisible(this.els.menuEl)) {
                DOMUtil.stopEvent(e);
                switch (code) {
                    case 38: // up
                        this.setPrevItem();
                        break;
                    case 40: // down
                        this.setNextItem();
                        break;
                }
            } else {
                this.showMenu();
            }
        } else if (code == 13) {
            DOMUtil.stopEvent(e);
            if (this.selectedItem) {
                var item = this.selectedItem;
                item.click();
                this.selectedItem = null;


            } else {
                this.afterEdit();
                this.hideMenu();
                this.input.blur();
            }

            //Nhấn ESC
        } else if (code == 9 || code == 27) {
            this.afterEdit();
            this.hideMenu();
        }

    }

    onKeyUp(target, code, e) {
        if (isCharacterKeyPress(e) || code == 8) {
            this.pressKey = true;

            let key = this.input.value;
            if (isValue(key)) {
                this.showMenu();
                this.els.menuEl.querySelectorAll(".cssprefix-combobox-item").forEach(item => {
                    let data = item.data;
                    if (data[this.options.displayField].toLowerCase().indexOf(key.toLowerCase()) >= 0) {
                        DOMUtil.show(item);
                    } else {
                        DOMUtil.hide(item);
                    }
                });
                let visibleItems = this.listItems.filter((it) => {
                    return DOMUtil.isVisible(it);
                });
                let first = visibleItems.length == 0 ? null : visibleItems[0];
                if (first) {
                    this.setSelectedItem(first);
                }

            } else {
                this.selectedItem = null;
                this.els.menuEl.querySelectorAll(".selected").forEach(item => {
                    DOMUtil.removeClass(item, "selected");
                });
                this.els.menuEl.querySelectorAll(".cssprefix-combobox-item").forEach(item => {
                    DOMUtil.show(item);
                });
                this.showMenu();
            }
        }



    }


    afterEdit() {
        if (this.pressKey && this.options.search) {
            let raw = this.input.value;
            if (!isValue(raw) && !this.options.required) {
                this.setValue(null);
            } else {
                if (this.selectedRecord) {
                    if (raw != this.selectedRecord[this.options.displayField]) {
                        this._setRawValue(this.selectedRecord);
                    }
                } else {
                    this._setRawValue(null);
                }
            }

        }
        this.pressKey = false;
    }

    /**
     * Set text hiển thị lên combobox. Nếu chỉ là dropdown thì không hiển thị
     * Created by ndquang 06/2019
     */
    _setRawValue(data) {
        let raw = "";

        if (this.options.search == true) {
            if (data) {
                if (isFn(this.options.customDisplay)) {
                    raw = this.options.customDisplay(data);
                } else {
                    raw = data[this.options.displayField];
                }
            } else {
                raw = "";
            }

            if (data && !isValue(data[this.options.valueField])) {
                raw = "";
            }
            this.input.value = raw;
        } else {
            if (data) {
                if (isFn(this.options.customDisplay)) {
                    raw = this.options.customDisplay(data);
                } else {
                    raw = formatData(this.displayTmpl, data);
                }

            } else {
                raw = "<div style='color:#9e9e9e'>" + this.options.emptyText + "</div>";
            }
            DOMUtil.html(this.input, raw);
        }
    }

    setPosition() {
        let bodyCoords = DOMUtil.coords(document.body);
        let bodyWidth = bodyCoords.width;
        let bodyHeight = bodyCoords.height;
        if (bodyHeight > window.screen.height || bodyHeight == 0) bodyHeight = window.screen.height;
        if (bodyWidth > window.screen.width || bodyWidth == 0) bodyWidth = window.screen.width;
        let triggerCoords = DOMUtil.coords(this.input);
        let maxHeight = "450px";
        if (!this.options.maxHeight) {
            maxHeight = bodyHeight - triggerCoords.top - triggerCoords.height - 32;
            maxHeight = maxHeight + "px";
        } else {
            maxHeight = this.options.maxHeight;
        }

        let left = triggerCoords.left + triggerCoords.width - DOMUtil.coords(this.els.menuEl).width;
        if (left < 0) {
            DOMUtil.css(this.els.menuEl, "right", left);
        }

        DOMUtil.css(this.els.menuEl, { "max-height": maxHeight });
    }

    _doSelectRecord(record, stopEvent) {
        if (record && !isValue(record[this.options.valueField])) {
            record = null;
        }
        if (record) {
            this._setRawValue(record);
            this.selectedRecord = record;
        } else {
            this._setRawValue(null);
            this.selectedRecord = null;
        }

        if (!stopEvent) {
            this.fireEvent("change", this.selectedRecord, this);
        }
    }

    setValue(val, stopEvent) {
        const record = this.data.find((d) => {
            return d[this.options.valueField] === val;
        });

        this._doSelectRecord(record, stopEvent);
    }


    getValue() {
        return this.selectedRecord ? this.selectedRecord[this.options.valueField] : null;
    }

    getSelectedRecord() {
        return this.selectedRecord;
    }

    selectFirst(stopEvent) {
        var record = this.data[0];
        this._doSelectRecord(record, stopEvent);
    }

    setSelectedItem(item) {
        this.els.menuEl.querySelectorAll(".selected").forEach(item => { DOMUtil.removeClass(item, "selected") });
        DOMUtil.addClass(item, "selected");
        this.selectedItem = item;
        if (!this.isVisibleInParent(item, this.els.menuEl, 40)) {
            smoothScrollToTarget(this.els.menuEl, item);
        }
    };

    isVisibleInParent(element, parent, offsetBottom) {
        offsetBottom = offsetBottom || 0;
        if (DOMUtil.isVisible(element)) {
            const coords = DOMUtil.coords(element);
            const coordsParent = DOMUtil.coords(parent);
            const isVertical = (coords.top < coordsParent.top + coordsParent.height - offsetBottom && coords.top > coordsParent.top) || (coords.top + coords.height < coordsParent.top + coordsParent.height - offsetBottom && coords.top + coords.height > coordsParent.top);
            const isHorizontal = (coords.left < coordsParent.left + coordsParent.width && coords.left + coords.width > coordsParent.left) || (coords.left + coords.width < coordsParent.left + coordsParent.width && coords.left + coords.width > coordsParent.left);
            return isVertical && isHorizontal;

        } else {
            return false;
        }
    }

    showMenu(fromClick) {
        if (!this.isDisable) {
            if (fromClick) {
                this.els.menuEl.querySelectorAll(".cssprefix-combobox-item").forEach((item) => {
                    let data = item.data;
                    if (this.selectedRecord && this.selectedRecord[this.options.valueField] == data[this.options.valueField]) {
                        this.setSelectedItem(item);
                    }
                    DOMUtil.show(item);

                });
            }

            DOMUtil.show(this.els.menuEl);
            this.setPosition();
        }

    };

    loadData(data) {
        this.data = data;
        this.renderMenu(data);
    }

    getItem(data) {
        //Nếu có custom thì gọi vào hàm custom
        let item;
        if (isFn(this.options.getItem)) {
            item = this.options.getItem(data, this);
        }
        if (!item) {
            //Item mặc định
            let title = data[this.options.displayField];
            item = DOMUtil.fromTemplate("<div class='cssprefix-combobox-item'></div>");
            DOMUtil.attr(item, "title", title);
            DOMUtil.text(item, data[this.options.displayField]);
        }
        return item;

    };


    hideMenu() {
        DOMUtil.hide(this.els.menuEl);
        this.selectedItem = null;
        this.els.menuEl.querySelectorAll(".selected").forEach(item => { DOMUtil.removeClass(item, "selected"); });
    };

    disable() {
        this.isDisable = true;
        DOMUtil.addClass(this.element, "disable");
    };

    enable() {
        this.isDisable = false;
        DOMUtil.removeClass(this.element, "disable");
    };



}

// Xuất class Button
export default Combobox;

