

export function getQueryParams(url) {
    if (!url) url = location.href;

    if (validate(url)) {
        const urlObject = new URL(url);
        const params = urlObject.searchParams;
        const queryParams = {};
        for (const [key, value] of params) {
            queryParams[key] = value;
        }

        return queryParams;
    } else {
        let params = {};
        let id = url.indexOf("?");
        let search = id > 0 ? url.slice(id) : null;
        if (search && search.indexOf("?") == 0) {
            var arr = search.substring(1).split("&");
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].length > 0) {
                    var m = arr[i].indexOf("=");
                    if (m >= 0) {
                        var name = arr[i].substr(0, m);
                        params[name] = decodeURIComponent(arr[i].substr(m + 1));
                    } else {
                        params[arr[i]] = "";
                    }
                }
            }
        }

        return params;
    }
}

export function validate(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

export function joinPaths(baseUrl, ...paths) {
    let checkEnd = function (url) {
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    let url = baseUrl;
    paths.forEach(path => {
        url = checkEnd(url);
        url += path.startsWith('/') ? path : '/' + path;
    });
    return url;

}


/**
 * Add query param to url
 * @param {*} baseUrl 
 * @param {*} queryParams 
 * @returns 
 */
export function addQueryParamsToUrl(baseUrl, queryParams) {
    if (!queryParams) return baseUrl + "";

    if (validate(baseUrl)) {
        const parsedUrl = new URL(baseUrl);
        // Merge existing query parameters with new query parameters
        for (const key in queryParams) {
            parsedUrl.searchParams.set(key, queryParams[key]);
        }

        return parsedUrl.toString();
    } else {
        let queryString = objectToQueryString(queryParams);
        let currentQuery = getQueryParams(baseUrl);
        if (Object.keys(currentQuery).length > 0) {
            return baseUrl + "&" + queryString;
        } else if (baseUrl.indexOf("?") > 0) return baseUrl + "&" + queryString;
        return baseUrl + "?" + queryString;

    }

}

/**
 * Chuyển object sang dạng query string
 * @param {*} obj 
 * @returns string
 */
export function objectToQueryString(obj) {
    if (URLSearchParams) {
        const params = new URLSearchParams(obj).toString();
        return params;
    }

    return Object.keys(obj)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
        .join('&');
}   




