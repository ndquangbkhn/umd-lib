import {
    isValue,
    copyClipboard,
    downloadSVG,
    downloadPNG,
    format,
    DOMUtil,
    DOMClass
} from "@misa-umd/core";

import { getResource } from "@core";
import ImageType from "@data/image-type";
import _TEMPLATE_ from './VCardBox.html?raw';
import { vcardCreator } from "./VCard";

const DefaultAvatar = "data:image/png;base64,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"

class VCardBox extends DOMClass {

    default = {
        afterShow: null,
        language: "vi",
        onCopyClipboard: null
    };

    override = {
        template: _TEMPLATE_,
        resource: getResource(this.options.language),
        created() {

        },
        mounted: () => {
            this.initAction();
        },
        unmounted() {

        },
        click: {
        },
        scroll: {

        },
        keyboard: {

        }
    };

    getQRVCard() {
        if (!this.qrVcard) {
            this.qrVcard = vcardCreator();
        }
        return this.qrVcard;
    }


    initAction() {
        this.element.querySelectorAll("[action]").forEach((item) => {
            item.onclick = (e) => {
                var target = e.currentTarget;
                var action = DOMUtil.attr(target, "action");
                if (action == "copy") {

                    if (isValue(this.qrOption.shareLink)) {
                        let content = this.getQRVCard().getString(this.data);

                        let link = format(this.qrOption.shareLink, encodeURIComponent(content));
                        copyClipboard(link, this.qrOption.afterCopyClipboard);

                    }

                } else if (action == "svg") {
                    downloadSVG(this.els.qrCodeEl, this.data.FullName || "download");
                } else if (action == "png") {
                    var el = this.getQRVCard().create(this.data, Object.assign(this.qrOption, {
                        boxSize: 300,
                        imageType: ImageType.PNG
                    }));
                    downloadPNG(el, this.data.FullName || "download");
                } else if (action == "close") {
                    DOMUtil.hide(this.element);
                }
            };

        });
    }

    bindingData(contactData, option) {
        this.data = contactData;
        DOMUtil.text(this.els.fullNameEl, this.data.FullName);

        var avatar = this.data.Avatar;
        if (!avatar) {
            avatar = DefaultAvatar;
        }
        this.els.avatarEl.src = avatar;

        option = option || {};
        option.boxSize = 180;
        option.padding = 16;

        this.qrOption = option;
        let copyBtn = this.element.querySelector("[action='copy']");
        if (isValue(this.qrOption.shareLink)) {
            DOMUtil.show(copyBtn, "unset");
        } else {
            DOMUtil.hide(copyBtn);
        }

        let qrEl = this.getQRVCard().create(this.data, option);
        DOMUtil.empty(this.els.qrCodeEl);
        this.els.qrCodeEl.append(qrEl);

    }

    show(contactData, option) {
        super.show(contactData, option);
        this.bindingData(contactData, option);
        if (typeof option.afterShow == "function") {
            option.afterShow.call(this);
        }

        this.isShowing = true;
    };

    afterHide() {
        this.isShowing = false;
    }



}

export default VCardBox;