
export function pastePlainText(element) {
    function handlePaste(event) {
        // Ngăn chặn hành động dán mặc định
        event.preventDefault();

        // Lấy dữ liệu từ sự kiện `paste`
        const clipboardData = event.clipboardData || window.clipboardData;

        // Lấy dữ liệu dạng văn bản thuần túy từ clipboard
        const plainText = clipboardData.getData('text/plain');

        // Chèn dữ liệu văn bản thuần túy vào phần tử
        // Kiểm tra xem phần tử có thuộc tính `contenteditable` không
        if (element.isContentEditable) {
            // Nếu phần tử là nội dung có thể chỉnh sửa (contenteditable), chèn văn bản tại vị trí con trỏ chuột
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(plainText));
            }
        } else {
            // Nếu phần tử không có thuộc tính `contenteditable`, cập nhật giá trị của phần tử (chỉ áp dụng cho các phần tử `input` và `textarea`)
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
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

    return DOMUtil;
}


export function pasteTextContent(element, whiteList = []) {
    function removeEventAttributesAndRiskyTags(element) {
        const tagName = element.tagName.toLowerCase();
        if (!whiteList) whiteList = ['a', 'br', 'b', 'span', "h1", "h2", "h3", "h4", "h5", "h6", "i", "u", "div"];
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
        // Lấy dữ liệu từ sự kiện `paste`
        const clipboardData = event.clipboardData || window.clipboardData;

        const htmlContent = clipboardData.getData('text/html');

        if (element.isContentEditable && htmlContent) {
            // Ngăn chặn hành động dán mặc định
            event.preventDefault();
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
                console.log(doc.body.innerHTML);
                let tempDiv = document.createElement('div');
                tempDiv.innerHTML = doc.body.innerHTML;
                while (tempDiv.firstChild) {
                    range.insertNode(tempDiv.firstChild);
                }

                // Move the cursor to the end of the inserted content
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }  
    }

    element.addEventListener("paste", handlePaste);


}
