
import emoticons from '@data/emoticons';

 
let codesMap = {},
primaryCodesMap = {};


const metachars = /[[\]{}()*+?.\\|^$\-,&#\s]/g;
const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
};

function escape(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

let i, patterns = [];

 

Object.keys(emoticons).forEach((name) => {
    let codes = emoticons[name].codes;
    let emoji = emoticons[name].emoji;
    for (i in codes) {
        let code = codes[i];
        codesMap[code] = emoji;
        codesMap[escape(code)] = emoji;
        if (i == 0) {
            primaryCodesMap[code] = emoji;
        }
    }
});

Object.keys(codesMap).forEach((code) => {
    patterns.push('(' + code.replace(metachars, "\\$&") + ')');
});

const regexp = new RegExp(patterns.join('|'), 'g');


/**
 * Replace emoticons in text.
 *
 * @param {String} text
 * @param {Function} [fn] optional template builder function.
 */
export function toEmoji(text) {
    return text.replace(regexp, function (code) {
        return codesMap[code]
    });
};
