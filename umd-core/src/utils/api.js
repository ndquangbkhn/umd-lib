import { serialize } from "./converter";
import { addQueryParamsToUrl } from "./url";

// This function is used to make API calls to the server
export async function callAsync(url, method, param, header) {
    try {
        if (!method) method = "GET";
        let options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (header) {
            options.headers = { ...options.headers, ...header };
        }

        if (method == "POST" && param) {
            options.body = serialize(param);
        }

        if (method == "GET" && param && Object.keys(param).length > 0) {
            const hasExistingQuery = url.includes('?');
            const newQueryString = new URLSearchParams(param).toString();
            url = hasExistingQuery ? `${url}&${newQueryString}` : `${url}?${newQueryString}`;
        }

        const response = await fetch(url, options);

        let data = {};
        if (response.ok) {
            data = await response.json();
        } else {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error('Failed:', error);
        return null; // Handle error appropriately
    }
}

export function postAsync(url, param, header) {
    return callAsync(url, "POST", param, header);
}

export function getAsync(url, param, header) {
    if (param && typeof param == "object") {
        url = addQueryParamsToUrl(url, param);
    }
    return callAsync(url, "GET", {}, header);
}