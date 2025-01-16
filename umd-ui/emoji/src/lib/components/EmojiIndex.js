import _all from "@data/data";
import _nimbleEmojiIndex from "@lib/components/NimbleEmojiIndex";

 
var emojiIndex = new _nimbleEmojiIndex(_all);
var emojis = emojiIndex.emojis,
    emoticons = emojiIndex.emoticons;

function search() {
    return emojiIndex.search.apply(emojiIndex, arguments);
}

export default {
    search,
    emojis,
    emoticons
};

