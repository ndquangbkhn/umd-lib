
import { objectSpread } from "@lib/common/object";
import  data from "@data/data";
import { getEmojiDefaultProps } from "@lib/components/EmojiDefaultProps";
import _nimbleEmoji from "@lib/components/NimbleEmoji";


let Emoji = function Emoji(props) {
    for (let k in Emoji.defaultProps) {
        if (props[k] == undefined && Emoji.defaultProps[k] != undefined) {
            props[k] = Emoji.defaultProps[k];
        }
    }

    return (0, _nimbleEmoji())(objectSpread({}, props));
};

Emoji.defaultProps = objectSpread({}, getEmojiDefaultProps(), {
    data: data
});

export default Emoji;


