export function scrollEvent(element, handle, timeout) {
    if (!timeout) timeout = 100;
    let handleScroll = function (e) {
        if (typeof handle.onScroll == "function") {
            handle.onScroll();
        }
        clearTimeout(element.scrollTimeout);
        element.scrollTimeout = setTimeout(function () {
            if (typeof handle.onStopScroll == "function") {
                handle.onStopScroll();
            }

            var top = element.scrollTop;
            var oldTop = element.oldTop || 0;
            var curTop = top + element.clientHeight;
            var isBottom = curTop >= element.scrollHeight;
            var isTop = top < 1;
            if (isBottom && oldTop < curTop && typeof handle.onTotalScroll == 'function') {
                handle.onTotalScroll();
            }
            if (isTop && typeof handle.onTotalScrollBack == 'function') {
                handle.onTotalScrollBack();
            }
            element.oldTop = curTop;

        }, timeout);
    };
    // Attach the scroll event listener to the element
    element.addEventListener('scroll', handleScroll);
}

export function smoothScrollToTarget(parentElement, targetElement) {
    if (!parentElement || !targetElement) {
        console.error('Invalid parent or element selector');
        return;
    }

    const parentRect = parentElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const offsetTop = targetRect.top - parentRect.top + parentElement.scrollTop;

    parentElement.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
    });
}
