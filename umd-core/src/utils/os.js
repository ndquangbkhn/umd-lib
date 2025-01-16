const AGENTS = {
    wp: /(Windows Phone(?: OS)?)\s(\d+)\.(\d+(\.\d+)?)/,
    fire: /(Silk)\/(\d+)\.(\d+(\.\d+)?)/,
    android: /(Android|Android.*(?:Opera|Firefox).*?\/)\s*(\d+)\.?(\d+(\.\d+)?)?/,
    iphone: /(iPhone|iPod).*OS\s+(\d+)[\._]([\d\._]+)/,
    ipad: /(iPad).*OS\s+(\d+)[\._]([\d_]+)/,
    meego: /(MeeGo).+NokiaBrowser\/(\d+)\.([\d\._]+)/,
    webos: /(webOS)\/(\d+)\.(\d+(\.\d+)?)/,
    blackberry: /(BlackBerry|BB10).*?Version\/(\d+)\.(\d+(\.\d+)?)/,
    playbook: /(PlayBook).*?Tablet\s*OS\s*(\d+)\.(\d+(\.\d+)?)/,
    windows: /(MSIE)\s+(\d+)\.(\d+(\.\d+)?)/,
    tizen: /(tizen).*?Version\/(\d+)\.(\d+(\.\d+)?)/i,
    sailfish: /(sailfish).*rv:(\d+)\.(\d+(\.\d+)?).*firefox/i,
    ffos: /(Mobile).*rv:(\d+)\.(\d+(\.\d+)?).*Firefox/
};
const OS_NAMES = {
    ios: /^i(phone|pad|pod)$/i,
    android: /^android|fire$/i,
    blackberry: /^blackberry|playbook/i,
    windows: /windows/,
    wp: /wp/,
    flat: /sailfish|ffos|tizen/i,
    meego: /meego/
};

const BROWSERS = {
    omini: /Opera\sMini/i,
    omobile: /Opera\sMobi/i,
    firefox: /Firefox|Fennec/i,
    mobilesafari: /version\/.*safari/i,
    ie: /MSIE|Windows\sPhone/i,
    chrome: /chrome|crios/i,
    webkit: /webkit/i
};

const TABLETS = { tablet: /playbook|ipad|fire/i };

function testRx(agent, rxs, dflt) {
    for (let rx in rxs) {
        if (rxs.hasOwnProperty(rx) && rxs[rx].test(agent)) {
            return rx;
        }
    }
    return dflt !== undefined ? dflt : agent;
}

//phát hiện os bằng userAgent
export function detectOS() {
    let ua = navigator.userAgent;
    let os = false;
    let match = [];
    let notAndroidPhone = !/mobile safari/i.test(ua);

    for (var agent in AGENTS) {
        if (AGENTS.hasOwnProperty(agent)) {
            match = ua.match(AGENTS[agent]);
            if (match) {
                if (agent == 'windows' && 'plugins' in navigator) {
                    return false;
                }
                os = {};
                //tên thiết bị
                os.device = agent;
                //tablet
                os.tablet = testRx(agent, TABLETS, false);
                //ten trinh duyet
                os.browser = testRx(ua, BROWSERS, 'default');
                //ten os
                os.name = testRx(agent, OS_NAMES);
                os[os.name] = true;
                //có phai dang chay trên nền tảng cordova ko
                os.cordova = typeof window.PhoneGap !== 'undefined' || typeof window.cordova !== 'undefined';
                //Phải là chế độ standalone, chạy trong UIWebview của app hay trên trình duyệt
                os.appMode = window.navigator.standalone || /file|local|wmapp/.test(window.location.protocol) || os.cordova;
                if (os.android && (global.devicePixelRatio < 1.5 && os.flatVersion < 400 || notAndroidPhone) && (global.screenWidth > 800 || global.screenHeight > 800)) {
                    os.tablet = agent;
                }
                break;
            }
        }
    }
    return os;
}

