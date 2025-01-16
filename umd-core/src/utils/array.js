export function distinctObject(array, key) {
    var flags = [], output = [], l = array.length, i;
    for (i = 0; i < l; i++) {
        if (flags[array[i][key]]) continue;
        flags[array[i][key]] = true;
        output.push(array[i]);
    }
    return output;
}