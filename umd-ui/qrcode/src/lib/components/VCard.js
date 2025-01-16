
import QRFactory from "./Factory";
import { assign } from "@aq-umd/core";

const VCARD_DEFAULT = {
    FirstName: "",
    LastName: "",
    FullName: "",
    JobTitle: "",
    Organization: "",
    Mobile: "",
    OfficeTel: "",
    Email: "",
    OfficeEmail: "",
    Website: "",
    Address: ""
};

function makeVCardString(data) {
    let content = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        'FN;CHARSET=UTF-8: ' + data.FullName,
        'N;CHARSET=UTF-8: ' + data.FirstName + ';' + data.LastName + ';;;'
    ];

    if (data.JobTitle) content.push('TITLE: ' + data.JobTitle);
    if (data.Organization) content.push('ORG: ' + data.Organization);
    if (data.Mobile) content.push('TEL;TYPE=HOME,VOICE: ' + data.Mobile);
    if (data.OfficeTel) content.push('TEL;TYPE=WORK,VOICE: ' + data.OfficeTel);
    if (data.Email) content.push('EMAIL;type=HOME,INTERNET: ' + data.Email);
    if (data.OfficeEmail) content.push('EMAIL;type=WORK,INTERNET: ' + data.OfficeEmail);
    if (data.Website) content.push('URL: ' + data.Website);
    if (data.Address) content.push('ADR;TYPE=HOME,DOM,POSTAL,PREF: ' + data.Address);
    if (data.CompanyAddress) content.push('ADR;TYPE=WORK,POSTAL,PARCEL: ' + data.CompanyAddress);

    content.push('END:VCARD');

    return content.join('\n');
}

function removeHTML(text) {
    if (text == null || text == undefined || text == "") {
        return "";
    }
    var n = text + "";
    return n.replace(/(<([^>]+)>)/ig, "");
}


export function vcardCreator(factory) {
    let _factory = factory;

    let vcardCreator = {};
    vcardCreator.getString = function (data) {
        if (!_factory) _factory = new QRFactory();
        var vcard = {};
        data.CompanyAddress = removeHTML(data.CompanyAddress);
        data.Address = removeHTML(data.Address);
        data.FirstName = removeHTML(data.FirstName);
        data.LastName = removeHTML(data.LastName);
        data.FullName = removeHTML(data.FullName);
        data.JobTitle = removeHTML(data.JobTitle);
        data.Organization = removeHTML(data.Organization);
        data.Mobile = removeHTML(data.Mobile);
        data.OfficeTel = removeHTML(data.OfficeTel);
        data.Email = removeHTML(data.Email);
        data.OfficeEmail = removeHTML(data.OfficeEmail);
        data.Website = removeHTML(data.Website);


        if (data.FullName && (!data.FirstName || !data.LastName)) {
            var arr = data.FullName.split(" ");
            if (arr.length >= 1) {
                if (!data.LastName) data.LastName = arr[arr.length - 1];
                if (!data.FirstName) {
                    arr[arr.length - 1] = "";
                    data.FirstName = arr.join(" ");
                }
            }
        }

        assign(vcard, VCARD_DEFAULT, data);
        return makeVCardString(vcard);
    };

    vcardCreator.create = function (data, option) {
        if (!_factory) _factory = new QRFactory();
        let text = vcardCreator.getString(data);
        var qr = _factory.create(text, option);
        return qr;
    };

    
    return vcardCreator;
}


