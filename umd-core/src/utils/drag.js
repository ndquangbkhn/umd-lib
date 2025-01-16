function getOffset(element) {
    const rect = element.getBoundingClientRect();
    // Lấy giá trị cuộn của trang (scroll) từ document.documentElement
    const scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    // Trả về đối tượng chứa thuộc tính top và left
    return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft
    };
}

export function makeElementDraggable(el) {
    const body = document.body;
    const rect = body.getBoundingClientRect();
    if (rect.width * rect.height == 0) {
        console.log("body has not a size");
        return;
    }

    let origin_position = {};

    el.style.position = "fixed";
    let startDrag = function (e) {

        let offset = getOffset(el);

        origin_position = {
            relX: e.pageX - offset.left,
            relY: e.pageY - offset.top,
            maxX: body.clientWidth - el.clientWidth - 10,
            maxY: body.clientHeight - el.clientHeight - 10
        };
        body.removeEventListener("mousemove", startMoving);
        body.addEventListener("mousemove", startMoving);
    };

    let endDrag = function (e) {
        body.removeEventListener("mousemove", startMoving);
    };

    let startMoving = function (e) {

        if (!origin_position) {
            return;
        }
        var relX = origin_position.relX;
        var relY = origin_position.relY;
        var maxX = origin_position.maxX;
        var maxY = origin_position.maxY;
        var diffX = Math.min(maxX, Math.max(0, e.pageX - relX));
        var diffY = Math.min(maxY, Math.max(0, e.pageY - relY));
        requestAnimationFrame(x => {
            requestAnimationFrame(x => {
                // Cập nhật vị trí của phần tử
                el.style.left = `${diffX}px`;
                el.style.top = `${diffY}px`;
            });
        });
        el.setAttribute("moving", true);
    };

    el.removeEventListener('mousedown', startDrag);
    el.addEventListener('mousedown', startDrag);

    body.removeEventListener("mouseup", endDrag);
    body.addEventListener("mouseup", endDrag);

    return el;
}