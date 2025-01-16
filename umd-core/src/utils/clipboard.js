
function copyByTextArea(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Append the textarea to the document body (it will be hidden)
    document.body.appendChild(textarea);

    // Select the text inside the textarea
    textarea.select();

    // Execute the 'copy' command to copy the selected text
    document.execCommand('copy');

    // Remove the temporary textarea from the document
    document.body.removeChild(textarea);

};

export function copyClipboard(text, copyDone) {

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (typeof copyDone == "function") {
                    copyDone(text);
                }
            })
            .catch(err => {
                copyByTextArea(text);
                if (typeof copyDone == "function") {
                    copyDone(text);
                }
            });
    } else {
        copyByTextArea(text);
        if (typeof copyDone == "function") {
            copyDone(text);
        }
    }
}
