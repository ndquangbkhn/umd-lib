/**
 * Replaces all occurrences of a search key with a replacement string in the input string.
 * @param {string} inputString - The input string to be modified.
 * @param {string} searchKey - The search key to be replaced.
 * @param {string} replacementString - The replacement string.
 * @returns {string} - The updated string with all occurrences replaced.
 */
export function replaceAll(inputString, searchKey, replacementString) {
  const regex = new RegExp(searchKey, 'g');
  const updatedString = inputString.replace(regex, replacementString);
  return updatedString;
}

/**
 * Formats a template string by replacing placeholders with provided parameters.
 * @param {string} template - The template string with placeholders in the form of {index}.
 * @param {...any} params - The parameters to replace the placeholders.
 * @returns {string} - The formatted string with placeholders replaced by corresponding parameters.
 */
export function format(template, ...params) {
  return template.replace(/{(\d+)}/g, (match, index) => {
    const paramIndex = Number(index);
    if (paramIndex < params.length) {
      return params[paramIndex];
    }
    return match;
  });
}

export function formatData (template, data) {
  let t = template + "";
  if(!data) return t;
  Object.keys(data).forEach(function (key) {
      var k = "#" + key + "#";
      var reg = new RegExp("\\{" + k + "\\}", "gi");
      if (data[key] == null || data[key] == undefined) data[key] = "";
      t = t.replace(reg, data[key]);
  });

  return t;
};

export function hyphenateStyleName(string) {
  var s = string.replace(/([A-Z])/g, '-$1').toLowerCase();
  return s.replace(/^ms-/, '-ms-');
}
