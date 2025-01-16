
import _data from "@lib/Components/EmojiData";
import _stringFromCodePoint from "@lib/components/StringFromCodePoint";


const COLONS_REGEX = /^(?:\:([^\:]+)\:)(?:\:skin-tone-(\d)\:)?$/;
const SKINS = ['1F3FA', '1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];

export function unifiedToNative(unified) {
    var unicodes = unified.split('-'),
        codePoints = unicodes.map(function (u) {
            return "0x".concat(u);
        });

    var c = _stringFromCodePoint.apply(null, codePoints);

    return c
}

export function sanitize(emoji) {
    let name = emoji.name,
        short_names = emoji.short_names,
        skin_tone = emoji.skin_tone,
        skin_variations = emoji.skin_variations,
        emoticons = emoji.emoticons,
        unified = emoji.unified,
        custom = emoji.custom,
        customCategory = emoji.customCategory,
        imageUrl = emoji.imageUrl,
        id = emoji.id || short_names[0],
        colons = ":".concat(id, ":");

    if (custom) {
        return {
            id: id,
            name: name,
            short_names: short_names,
            colons: colons,
            emoticons: emoticons,
            custom: custom,
            customCategory: customCategory,
            imageUrl: imageUrl
        };
    }

    if (skin_tone) {
        colons += ":skin-tone-".concat(skin_tone, ":");
    }

    return {
        id: id,
        name: name,
        short_names: short_names,
        colons: colons,
        emoticons: emoticons,
        unified: unified.toLowerCase(),
        skin: skin_tone || (skin_variations ? 1 : null),
        "native": unifiedToNative(unified)
    };
}

export function getSanitizedData() {
    return sanitize(getData.apply(void 0, arguments));
}

export function getData(emoji, skin, set, data) {
    var emojiData = {};

    if (typeof emoji == 'string') {
        var matches = emoji.match(COLONS_REGEX);

        if (matches) {
            emoji = matches[1];

            if (matches[2]) {
                skin = parseInt(matches[2], 10);
            }
        }

        if (data.aliases.hasOwnProperty(emoji)) {
            emoji = data.aliases[emoji];
        }

        if (data.emojis.hasOwnProperty(emoji)) {
            emojiData = data.emojis[emoji];
        } else {
            return null;
        }
    } else if (emoji.id) {
        if (data.aliases.hasOwnProperty(emoji.id)) {
            emoji.id = data.aliases[emoji.id];
        }

        if (data.emojis.hasOwnProperty(emoji.id)) {
            emojiData = data.emojis[emoji.id];
            skin || (skin = emoji.skin);
        }
    }

    if (!Object.keys(emojiData).length) {
        emojiData = emoji;
        emojiData.custom = true;

        if (!emojiData.search) {
            emojiData.search = (0, _data.buildSearch)(emoji);
        }
    }

    emojiData.emoticons || (emojiData.emoticons = []);
    emojiData.variations || (emojiData.variations = []);

    if (emojiData.skin_variations && skin > 1) {
        emojiData = JSON.parse(JSON.stringify(emojiData));
        var skinKey = SKINS[skin - 1],
            variationData = emojiData.skin_variations[skinKey];

        if (variationData) {
            if (!variationData.variations && emojiData.variations) {
                delete emojiData.variations;
            }

            if (set && (variationData["has_img_".concat(set)] == undefined || variationData["has_img_".concat(set)]) || !set) {
                emojiData.skin_tone = skin;

                for (var k in variationData) {
                    var v = variationData[k];
                    emojiData[k] = v;
                }
            }
        }
    }

    if (emojiData.variations && emojiData.variations.length) {
        emojiData = JSON.parse(JSON.stringify(emojiData));
        emojiData.unified = emojiData.variations.shift();
    }

    return emojiData;
}

export function uniq(arr) {
    return arr.reduce(function (acc, item) {
        if (acc.indexOf(item) === -1) {
            acc.push(item);
        }

        return acc;
    }, []);
}

export function intersect(a, b) {
    var uniqA = uniq(a);
    var uniqB = uniq(b);
    return uniqA.filter(function (item) {
        return uniqB.indexOf(item) >= 0;
    });
}

export function deepMerge(a, b) {
    var o = {};

    for (var key in a) {
        var originalValue = a[key],
            value = originalValue;

        if (b.hasOwnProperty(key)) {
            value = b[key];
        }

        if ((0, typeof value === 'object')) {
            value = deepMerge(originalValue, value);
        }

        o[key] = value;
    }

    return o;
}


export function measureScrollbar() {
    if (typeof document == 'undefined') return 0;
    var div = document.createElement('div');
    div.style.width = '100px';
    div.style.height = '100px';
    div.style.overflow = 'scroll';
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    document.body.appendChild(div);
    var scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return scrollbarWidth;
}


export function throttleIdleTask(func) {
    var doIdleTask = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout;
    var running = false;
    return function throttled() {
        if (running) {
            return;
        }

        running = true;
        doIdleTask(function () {
            running = false;
            func();
        });
    };
}
