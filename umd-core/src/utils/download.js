export function download(url, fileName) {
    let downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

export function downloadSVG(element, fileName) {
    let svg;
    if (element.tagName == "SVG") {
        svg = element;
    } else {
        svg = element.querySelector("svg");
    }


    let serializer = new XMLSerializer();
    let svgData = serializer.serializeToString(svg);

    let svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    let svgUrl = URL.createObjectURL(svgBlob);
    if (fileName.toLowerCase().indexOf(".svg") < 0) {
        fileName += ".svg";
    }
    download(svgUrl, fileName);

}

export function downloadPNG(element, fileName) {
    let img;
    if (element.tagName == "IMG") {
        img = element;
    } else {
        img = element.querySelector("img");
    }

    if (img) {
        if (fileName.toLowerCase().indexOf(".png") < 0) {
            fileName += ".png";
        }
        let url = img.getAttribute("src");
        download(url, fileName);
    } else {
        console.error("No image found to download");
    }
}