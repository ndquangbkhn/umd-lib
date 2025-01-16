var contentEditable = document.querySelector("#test");
var container = document.querySelector("#picker");

global.initEmoji(container, contentEditable, function(e){ console.log(e)}, null, null, global.EmojiType.Facebook, "vi");
let originText = document.querySelector("#origin").innerHTML;
document.querySelector("#encoded").innerHTML = global.encodeEmoji(
    global.toEmoji(originText)
);
document.querySelector("#decoded").innerHTML = global.decodeEmoji(
    document.querySelector("#encoded").innerHTML
);