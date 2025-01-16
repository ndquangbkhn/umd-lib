//Hàm loại bỏ chuỗi tấn công trong đoạn mã html
export function removeXSS(htmlTemplate) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlTemplate, 'text/html');

    function removeEventAttributesAndRiskyTags(element) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'script' ||
            tagName === 'iframe' ||
            tagName === 'embed' ||
            tagName === 'frameset' ||
            tagName === 'marquee' ||
            tagName === 'xss' ||
            tagName === 'applet' ||
            tagName === 'base' ||
            tagName === 'style' ||
            tagName === 'html' ||
            tagName === 'body' ||
            tagName === 'animate' ||
            tagName === 'frame' ||
            tagName === 'object' ||
            tagName === 'link' && element.getAttribute('rel') === 'import' ||
            tagName === 'meta' && element.getAttribute('http-equiv') === 'refresh') {
            element.parentNode.removeChild(element);
        } else {
            const attributes = element.attributes;
            for (let i = attributes.length - 1; i >= 0; i--) {
                const attr = attributes[i];
                if (attr.name.startsWith('on')) {
                    element.removeAttribute(attr.name);
                }
            }

            if (element.tagName.toLowerCase() == "a") {
                if (element.href.indexOf("javascript:") >= 0) {
                    element.href = "";
                }
            } else if (element.tagName.toLowerCase() == "img") {
                if (element.src.indexOf("javascript:") >= 0) {
                    element.src = "";
                }
            } else if (element.tagName.toLowerCase() == "iframe" || element.tagName.toLowerCase() == "embed") {
                if (element.src.indexOf("data:") >= 0) {
                    element.src = "";
                }
            }
        }
    }

    const elements = doc.body.querySelectorAll('*');
    elements.forEach((element) => {
        removeEventAttributesAndRiskyTags(element);
    });

    // Return the sanitized HTML as a string
    return doc.body.innerHTML;
}



export function pasteContentText(element) {
    function removeEventAttributesAndRiskyTags(element) {
        const tagName = element.tagName.toLowerCase();
        let whiteList = ['a', 'br', 'b', 'span', "h1", "h2", "h3", "h4", "h5", "h6", "i", "u", "div"];
        if (!whiteList.includes(tagName)) {
            element.parentNode.removeChild(element);
        } else {
            //remove all attribute
            const attributes = element.attributes;
            for (let i = attributes.length - 1; i >= 0; i--) {
                const attr = attributes[i];
                element.removeAttribute(attr.name);
            }
        }

    }

    function handlePaste(event) {
        // Ngăn chặn hành động dán mặc định
        event.preventDefault();

        // Lấy dữ liệu từ sự kiện `paste`
        const clipboardData = event.clipboardData || window.clipboardData;

        // Chèn dữ liệu văn bản thuần túy vào phần tử
        // Kiểm tra xem phần tử có thuộc tính `contenteditable` không
        if (element.isContentEditable) {
            const htmlContent = clipboardData.getData('text/html');
            console.log(htmlContent);
            // Nếu phần tử là nội dung có thể chỉnh sửa (contenteditable), chèn văn bản tại vị trí con trỏ chuột
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlContent, 'text/html');
                const elements = doc.body.querySelectorAll('*');
                elements.forEach((element) => {
                    removeEventAttributesAndRiskyTags(element);
                });
                let div = document.createElement('div');
                div.innerHTML = doc.body.innerHTML;
                range.insertNode(div);
            }
        } else {
            // Nếu phần tử không có thuộc tính `contenteditable`, cập nhật giá trị của phần tử (chỉ áp dụng cho các phần tử `input` và `textarea`)
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                const plainText = clipboardData.getData('text/plain');
                const start = element.selectionStart;
                const end = element.selectionEnd;
                const text = element.value;
                // Cập nhật giá trị của phần tử
                element.value = text.slice(0, start) + plainText + text.slice(end);

                // Đặt con trỏ chuột ở cuối văn bản dán
                element.selectionStart = element.selectionEnd = start + plainText.length;
            }
        }
    }

    element.addEventListener("paste", handlePaste);

    
}