
export function focusNode(node) {
    try {
        node.focus();
    } catch (e) { }
};



export function isTextNode(object) {
    var doc = object ? object.ownerDocument || object : document;
    var defaultView = doc.defaultView || window;
    var isNode = !!(object && (typeof defaultView.Node === 'function' ? object instanceof defaultView.Node : typeof object === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string'));
    return isNode && object.nodeType == 3;
}

export function containsNode(outerNode, innerNode) {
    if (!outerNode || !innerNode) {
        return false;
    } else if (outerNode === innerNode) {
        return true;
    } else if (isTextNode(outerNode)) {
        return false;
    } else if (isTextNode(innerNode)) {
        return containsNode(outerNode, innerNode.parentNode);
    } else if ('contains' in outerNode) {
        return outerNode.contains(innerNode);
    } else if (outerNode.compareDocumentPosition) {
        return !!(outerNode.compareDocumentPosition(innerNode) & 16);
    } else {
        return false;
    }
}

export function getActiveElement(doc) {
    doc = doc || (typeof document !== 'undefined' ? document : undefined);
    if (typeof doc === 'undefined') {
        return null;
    }
    try {
        return doc.activeElement || doc.body;
    } catch (e) {
        return doc.body;
    }
};

