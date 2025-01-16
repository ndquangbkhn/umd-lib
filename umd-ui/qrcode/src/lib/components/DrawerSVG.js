import { assign } from "@misa-umd/core";

class SVGDrawer {
    default = {
        colorLight: "#fff",
        colorDark: "#000",
        colorPrimary: "#c40d00"
    };

    option = {};
    constructor(options) {
        assign(this.option, this.default, options);

    };
    
    updateColors(colors){
        assign(this.option, colors);
    }

    clear(element) {
        while (element.hasChildNodes())
            element.removeChild(element.lastChild);
    }

    makeSVG(tag, attrs) {
        var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (var k in attrs)
            if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
        return el;
    }

    draw(element, oQRCode, option) {
        if (!option) {
            option = this.option;
        } else {
            assign(option, option, option);
        }

        var nCount = oQRCode.getModuleCount();

        var svgSize = option.boxSize;
        let padding = option.padding || 0;
        let cellSize = option.celSize || 2;

        this.clear(element);
        var svg = this.makeSVG("svg", {
            "xmlns": "http://www.w3.org/2000/svg",
            "xmlns:xlink": "http://www.w3.org/1999/xlink",
            "xmlns:ev": "http://www.w3.org/2001/xml-events",
            'viewBox': '0 0 ' + String(svgSize) + " " + String(svgSize),
            'width': svgSize, 'height': svgSize
        });

        svg.appendChild(this.makeSVG("rect", { "width": "100%", "height": "100%", 'fill': option.colorLight }));

        let _ui_id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        let darkTemplateID = "dark" + _ui_id;
        let primaryTemplateID = "primary" + _ui_id;

        let darkOption = { "width": cellSize, "height": cellSize, "id": darkTemplateID };
        let primaryAttr = { "fill": option.colorPrimary, "width": cellSize, "height": cellSize, "id": primaryTemplateID };

        if (option.style == "dot") {
            darkOption.rx = cellSize;
        }

        let defs = this.makeSVG("defs");
        defs.appendChild(this.makeSVG("rect", darkOption));
        defs.appendChild(this.makeSVG("rect", primaryAttr));
        svg.appendChild(defs);

        let g = this.makeSVG("g", { "fill": option.colorDark });
        for (let row = 0; row < nCount; row++) {
            for (let col = 0; col < nCount; col++) {
                if (oQRCode.isDark(row, col)) {

                    let template = darkTemplateID;
                    if ((row >= 0 && row <= 7 && col >= 0 && col <= 7) ||
                        (row >= 0 && row <= 7 && col >= nCount - 7 && col <= nCount) ||
                        (row >= nCount - 7 && row <= nCount && col >= 0 && col <= 7)) {
                        template = primaryTemplateID;
                    }
                    let child = this.makeSVG("use", { "x": String(padding + col * cellSize), "y": String(padding + row * cellSize), "href": "#" + template });
                    g.appendChild(child);
                }
            }
        }

        svg.appendChild(g);
        element.appendChild(svg);

        return svgSize;
    };

}


export default new SVGDrawer();