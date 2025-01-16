

import _store from "@lib/Components/EmojiStore";

const DEFAULTS = ['+1', 'grinning', 'kissing_heart', 'heart_eyes', 'laughing', 'stuck_out_tongue_winking_eye', 'sweat_smile', 'joy', 'scream', 'disappointed', 'unamused', 'weary', 'sob', 'sunglasses', 'heart', 'poop'];
let frequently, initialized;
let defaults = {};

function init() {
    initialized = true;
    frequently = _store.getStorage('frequently');
}

function add(emoji) {
    if (!initialized) init();
    var id = emoji.id;
    frequently || (frequently = defaults);
    frequently[id] || (frequently[id] = 0);
    frequently[id] += 1;

    _store.setStorage('last', id);
    _store.setStorage('frequently', frequently);
}

function get(perLine) {
    if (!initialized) init();

    if (!frequently) {
        defaults = {};
        let result = [];

        for (let i = 0; i < perLine; i++) {
            defaults[DEFAULTS[i]] = perLine - i;
            result.push(DEFAULTS[i]);
        }

        return result;
    }

    let quantity = perLine * 4;
    let frequentlyKeys = [];

    for (let key in frequently) {
        if (frequently.hasOwnProperty(key)) {
            frequentlyKeys.push(key);
        }
    }

    let sorted = frequentlyKeys.sort(function (a, b) {
        return frequently[a] - frequently[b];
    }).reverse();
    let sliced = sorted.slice(0, quantity);

    let last = _store.getStorage('last');

    if (last && sliced.indexOf(last) == -1) {
        sliced.pop();
        sliced.push(last);
    }

    return sliced;
}

export default {
    add,
    get
};

