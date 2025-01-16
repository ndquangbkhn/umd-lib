import _all from "@data/data";
import _store from "@lib/components/EmojiStore";

export function getEmojiDefaultProps(){
    const userOption = _store.get("UserOption");
    const EmojiDefaultProps = {
        skin: 1,
        set: userOption.set,
        sheetSize: _all.sheet.sheetSize, //16/32
        sheetColumns: _all.sheet.sheetColumns,
        sheetRows: _all.sheet.sheetRows,
        "native": false,
        forceSize: false,
        tooltip: false,
        useButton: false
    
    };
    return EmojiDefaultProps;
}

export function getPickerDefaultProps(){
    const userOption = _store.get("UserOption");
    const EmojiDefaultProps = getEmojiDefaultProps();
    const PickerDefaultProps = {
        onClick: function onClick() {
    
        },
        onSelect: function onSelect() {
    
        },
        onSkinChange: function onSkinChange() { },
        emojiSize: 24,
        perLine: 9,
        i18n: {},
        style: {},
        emoji: 'department_store',
        color: userOption.color,
        set: EmojiDefaultProps.set,
        theme: userOption.theme || 'light', //dark
        skin: null,
        defaultSkin: EmojiDefaultProps.skin,
        native: EmojiDefaultProps.native,
        sheetSize: EmojiDefaultProps.sheetSize,
        emojisToShowFilter: null,
        emojiTooltip: EmojiDefaultProps.tooltip,
        useButton: false,
        autoFocus: false,
        enableFrequentEmojiSort: false,
        custom: [],
        skinEmoji: '',
        notFound: function notFound() { },
        notFoundEmoji: 'sleuth_or_spy',
        icons: {}
    };
    return  PickerDefaultProps;
} 

 
