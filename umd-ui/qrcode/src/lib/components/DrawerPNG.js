

import { assign } from "@misa-umd/core";
class PNGDrawer {

    default = {
        colorLight: "#fff",
        colorDark: "#000",
        colorPrimary: "#c40d00"
    };

    option = {};
    _android;

    constructor(options) {
        assign(this.option, this.default, options);
        this._android = this.getAndroid();
        if (this._android && this._android <= 2.1) {
            let factor = 1 / window.devicePixelRatio;
            let drawImage = CanvasRenderingContext2D.prototype.drawImage;

            CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
                if (("nodeName" in image) && /img/i.test(image.nodeName)) {
                    for (var i = arguments.length - 1; i >= 1; i--) {
                        arguments[i] = arguments[i] * factor;
                    }
                } else if (typeof dw == "undefined") {
                    arguments[1] *= factor;
                    arguments[2] *= factor;
                    arguments[3] *= factor;
                    arguments[4] *= factor;
                }

                drawImage.apply(this, arguments);
            };
        }

    }

    updateColors(colors){
        assign(this.option, colors);
    }


    draw(element, oQRCode, option = null) {
        if (!option) {
            option = this.option;
        } else {
            assign(option, this.option, option);
        }

        let elCanvas = document.createElement("canvas");
        elCanvas.width = option.width;
        elCanvas.height = option.height;

        element.appendChild(elCanvas);

        let elImage = document.createElement("img");
        elImage.alt = "Scan me!";
        elImage.style.display = "none";
        element.appendChild(elImage);

        var nCount = oQRCode.getModuleCount();
        var celSize = option.celSize;
        var imgSize = option.boxSize;


        elCanvas.width = imgSize;
        elCanvas.height = imgSize;
        elImage.width = imgSize;
        elImage.height = imgSize;


        if (!option.padding) option.padding = 0;

        let oContext = elCanvas.getContext("2d");
        oContext.fillStyle = option.colorLight;
        oContext.fillRect(0, 0, imgSize, imgSize);


        for (var row = 0; row < nCount; row++) {
            for (var col = 0; col < nCount; col++) {
                let isDot = false;
                if (oQRCode.isDark(row, col)) {
                    isDot = true;
                    let color = option.colorDark;
                    if ((row >= 0 && row <= 7 && col >= 0 && col <= 7) ||
                        (row >= 0 && row <= 7 && col >= nCount - 7 && col <= nCount) ||
                        (row >= nCount - 7 && row <= nCount && col >= 0 && col <= 7)) {
                        color = option.colorPrimary;
                        isDot = false;
                    }
                    var nLeft = col * celSize + option.padding;
                    var nTop = row * celSize + option.padding;
                    oContext.strokeStyle = color;
                    oContext.lineWidth = 1;
                    oContext.fillStyle = color;


                    if (option.style == "dot" && isDot) {
                        let ra = celSize / 2;
                        oContext.beginPath();
                        oContext.arc(nLeft, nTop, ra, 0, 2 * Math.PI);
                        oContext.fill();
                    } else {
                        oContext.fillRect(nLeft, nTop, celSize, celSize);
                    }
                }
            }
        }


        elImage.src = elCanvas.toDataURL("image/png");
        elImage.style.display = "block";
        elCanvas.style.display = "none";

    };

    getAndroid() {
        var android = false;
        var sAgent = navigator.userAgent;

        if (/android/i.test(sAgent)) { // android
            android = true;
            var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

            if (aMat && aMat[1]) {
                android = parseFloat(aMat[1]);
            }
        }

        return android;
    }

}


export default new PNGDrawer();;