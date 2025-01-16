import stringFromCodePoint from '@lib/components/StringFromCodePoint';
import _all from '@data/data';
import _store from '@lib/components/EmojiStore';

export default function createRegex() {
    const NativeMap = _store.get("NativeMap");

    const data = _all.emojis;
    const natives = _all.natives;

    const metachars = /[[\]{}()*+?.\\|^$\-,&#\s]/g;
    const patterns = [];


    for (let name in data) {
        let emoj = data[name];
        patterns.push('(:' + name.replace(metachars, "\\$&") + ':)');

        let codePoints;
        let unicodes = emoj.b.split('-');
        codePoints = unicodes.map(function (u) {
            return "0x".concat(u);
        });

        let nativeText = stringFromCodePoint.apply(null, codePoints);

        if (nativeText) {
            NativeMap[nativeText] = name;
        }
    }

    const EmojiPattern = "(?:" + patterns.join('|') + "|" + natives.join("|") + ")";
    const Regexp = new RegExp(EmojiPattern, 'g');
    const TestEmojiPattern = "(^(" + patterns.join('|') + "|" + natives.join("|") + ")$)";
    const TestRegexp = new RegExp(TestEmojiPattern, 'g');

    return {
        EmojiPattern,
        Regexp,
        TestEmojiPattern,
        TestRegexp
    };

}

 
