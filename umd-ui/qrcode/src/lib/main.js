/**
* Thư viện tạo ảnh QRCode. Hỗ trợ tạo VCardUI
* Level L (Low)	7% of data bytes can be restored. 1
* Level M (Medium)	15% of data bytes can be restored. 0
* Level Q (Quartile)	25% of data bytes can be restored. 3
* Level H (High)	30% of data bytes can be restored. 2
* 
*/

import { downloadSVG, downloadPNG } from "@misa-umd/core";
import ErrorCorrectLevel from "@data/error-correct-level";
import ImageType from "@data/image-type";
import QRFactory from "./components/Factory";
import {vcardCreator} from "./components/VCard";
import VCardBox from "./components/VCardBox";


const OPTION_DEFAULT = {
    boxSize: 150,
    padding: 16,
    celSize: 2,
    colorDark: "#000000",
    colorLight: "#ffffff",
    colorPrimary: "#2196F3",
    imageType: ImageType.SVG,
    correctLevel: ErrorCorrectLevel.H
};


let _vcardCreator;
let _vcardBox;
let _factory;

function getQRVcard() {
    if(_vcardCreator) return _vcardCreator;
    let factory = getQRFactory();
    _vcardCreator = vcardCreator(factory);
    return _vcardCreator;
}

function getQRFactory() {
    if (!_factory) {
        _factory = new QRFactory();
    }
    return _factory;
}


function create(text, option) {
    let factory = getQRFactory();
    if(!option) option = {};
    option = Object.assign({}, OPTION_DEFAULT, option);
    var el = factory.create(text, option);
    return el;
}

function createVCard(contactData, option) {
    let qrVCard = getQRVcard();
    if(!option) option = {};
    option = Object.assign({}, OPTION_DEFAULT, option);
    return qrVCard.create(contactData, option);
}

function getVCardString(contactData) {
    let qrVCard = getQRVcard();
    return qrVCard.getString(contactData);
}

function showVCardBox(contactData, option) {
    if(!option) option = {};
    option = Object.assign({}, OPTION_DEFAULT, option);
    if (!_vcardBox) {
        _vcardBox = new VCardBox(document.body, option);
    }

    _vcardBox.show(contactData, option);
};

export default {
    ImageType,
    ErrorCorrectLevel,
    OPTION_DEFAULT,
    create,
    getVCardString,
    createVCard,
    showVCardBox,
    downloadSVG,
    downloadPNG
}