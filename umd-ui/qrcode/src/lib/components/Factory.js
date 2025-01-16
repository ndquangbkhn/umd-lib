
import { isValue, assign } from "@misa-umd/core";
import ImageType from "@data/image-type";
import ErrorCorrectLevel from "@data/error-correct-level";
import QRModel from "./Model";
import SVGDrawer from "./DrawerSVG";
import PNGDrawer from "./DrawerPNG";

const LIMIT_LENGTH = [
    [17, 14, 11, 7], [32, 26, 20, 14], [53, 42, 32, 24], [78, 62, 46, 34], [106, 84, 60, 44], [134, 106, 74, 58], [154, 122, 86, 64], [192, 152, 108, 84], [230, 180, 130, 98], [271, 213, 151, 119], [321, 251, 177, 137], [367, 287, 203, 155], [425, 331, 241, 177], [458, 362, 258, 194], [520, 412, 292, 220], [586, 450, 322, 250], [644, 504, 364, 280], [718, 560, 394, 310], [792, 624, 442, 338], [858, 666, 482, 382], [929, 711, 509, 403], [1003, 779, 565, 439], [1091, 857, 611, 461], [1171, 911, 661, 511], [1273, 997, 715, 535], [1367, 1059, 751, 593], [1465, 1125, 805, 625], [1528, 1190, 868, 658], [1628, 1264, 908, 698], [1732, 1370, 982, 742], [1840, 1452, 1030, 790], [1952, 1538, 1112, 842], [2068, 1628, 1168, 898], [2188, 1722, 1228, 958], [2303, 1809, 1283, 983], [2431, 1911, 1351, 1051], [2563, 1989, 1423, 1093], [2699, 2099, 1499, 1139], [2809, 2213, 1579, 1219], [2953, 2331, 1663, 1273]
];

class QRFactory {


    default = {
        boxSize: 150,
        padding: 16,
        celSize: 2,
        colorDark: "#000000",
        colorLight: "#ffffff",
        colorPrimary: "#2196F3",
        imageType: ImageType.SVG,
        correctLevel: ErrorCorrectLevel.H
    };

    options = {};

    constructor(options) {
        if (typeof options === 'string') {
            options = {
                text: options
            };
        }

        assign(this.options, this.default, options);

    }


    getContentLength(content) {
        var replacedText = encodeURI(content).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
        return replacedText.length + (replacedText.length != content ? 3 : 0);
    }

    getBox(size) {
        if (!isValue(size)) size = 200;
        var el = document.createElement("div");
        el.classList.add("misa-qr-code-box");
        el.style["box-sizing"] = "border-box";
        if (size) {
            el.style.width = size + "px";
            el.style.height = size + "px";
        }

        return el;
    }

    getTypeNumber(content, correctLevel) {
        let nType = 1;
        let length = this.getContentLength(content);

        for (let i = 0, len = LIMIT_LENGTH.length; i <= len; i++) {
            let nLimit = 0;
            let col = LIMIT_LENGTH[i];
            switch (correctLevel) {
                case ErrorCorrectLevel.L:
                    nLimit = col[0];
                    break;
                case ErrorCorrectLevel.M:
                    nLimit = col[1];
                    break;
                case ErrorCorrectLevel.Q:
                    nLimit = col[2];
                    break;
                case ErrorCorrectLevel.H:
                    nLimit = col[3];
                    break;
            }

            if (length <= nLimit) {
                break;
            } else {
                nType++;
            }
        }

        if (nType > LIMIT_LENGTH.length) {
            throw new Error("Too long data");
        }

        return nType;
    }

    getDrawer(type) {
        let drawer = SVGDrawer;
        if (type == ImageType.PNG && typeof CanvasRenderingContext2D == "function") {
            drawer = PNGDrawer;
        }
        return drawer;
    }

    getCellSize(width, count) {
        let a = width / count;
        let b = parseInt(a);
        if (b < 2) b = 2;
        return b;
    }


    create(content, option) {
        if (!option) {
            option = {};
        }
        option = Object.assign(this.default, option);
        let drawing = this.getDrawer(option.imageType);
        drawing.updateColors(option);
        var type = this.getTypeNumber(content, option.correctLevel);
        let model = new QRModel(type, option.correctLevel, content);
        model.make();

        let qrSize = model.getModuleCount();
        let boxSize = option.boxSize;

        if (boxSize) {
            option.celSize = this.getCellSize(boxSize, qrSize);
            boxSize = option.celSize * qrSize;
        } else if (option.celSize) {
            boxSize = option.celSize * qrSize;
        }


        if (option.padding > 0) {
            boxSize += 2 * option.padding;
        }
        option.boxSize = boxSize;
        option.qrSize = qrSize;

        let element = this.getBox(option.boxSize);
        element.title = content;

        drawing.draw(element, model, option);

        var wrap = document.createElement("div");
        wrap.appendChild(element);

        var html = wrap.innerHTML;
        wrap.innerHTML = html;
        html = null;
        model = null;
        return wrap.firstChild;
    };


}


export default QRFactory;