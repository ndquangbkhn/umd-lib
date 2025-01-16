//Function to generate .setting/service/index.js
import fs from "fs";
import path from "path";
const comment = `//This file is auto-generated. Do not edit directly.`;
const mode = process.argv[2]; // Tham số truyền vào: "true" hoặc "false"


function createFolder(folderPath){
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    } 
}
// Function to generate config by env
(function () {

    const file = mode === "fake" ? "fake/api.js" : "api.js";
    const serviceContent = `${comment}\nimport Service from "@lib/services/${file}";\nexport default Service;`;

    createFolder("src/.setting/service");
    fs.writeFileSync("src/.setting/service/index.js", serviceContent, "utf8");

})();

//Đọc config icon, variables tạo file css
//output: src/.setting/css/style.css
(function () {
    const data = fs.readFileSync('src/.setting/define.json', 'utf8');
    // Parse JSON data
    const config = JSON.parse(data);


    let configEnv = mode;
    let cssContent = "";
    // Duyệt qua các dữ liệu trong "data"
    let iconpublic = config["icons-public"];
    if (Array.isArray(iconpublic)) {
        let csspath = "assets";
        if (configEnv === "fake" || configEnv === "dev") {
            csspath = '../../../public/assets';
        }
        iconpublic.forEach(item => {
            const selector = item.name;
            const file = item.file;
            const size = item.size;
            const position = item.position || 'center'; // Mặc định là "center" nếu không có "position"

            // Tạo nội dung CSS cho từng selector
            let cssRule = `.cssprefix-${selector} {\n`;
            cssRule += `  background-image: url(${csspath}/${file});\n`; // Đường dẫn tới ảnh
            if (size) cssRule += `  background-size: ${size};\n`;
            cssRule += `  background-repeat: no-repeat;\n`;
            if (!position) position == "center";
            cssRule += `  background-position: ${position};\n`;
            cssRule += `}\n`;

            // Thêm vào nội dung CSS
            cssContent += cssRule;

            if (item.hover) {
                let cssRule = `.cssprefix-${selector}:hover {\n`;
                const file = item.hover;
                cssRule += `  background-image: url(${csspath}/${file});\n`; // Đường dẫn tới ảnh
                cssRule += `}\n`;

                cssContent += cssRule;
            }
        });
    }

    let iconinline = config["icons-inline"];
    if (Array.isArray(iconinline)) {
        let csspath = '../../lib/assets';
        iconinline.forEach(item => {
            const selector = item.name;
            const file = item.file;
            const size = item.size;
            const position = item.position || 'center'; // Mặc định là "center" nếu không có "position"

            // Tạo nội dung CSS cho từng selector
            let cssRule = `.cssprefix-${selector} {\n`;
            cssRule += `  background-image: url(${csspath}/${file});\n`; // Đường dẫn tới ảnh
            if (size) cssRule += `  background-size: ${size};\n`;
            cssRule += `  background-repeat: no-repeat;\n`;
            if (!position) position == "center";
            cssRule += `  background-position: ${position};\n`;
            cssRule += `}\n`;
            // Thêm vào nội dung CSS
            cssContent += cssRule;

            if (item.hover) {
                let cssRule = `.cssprefix-${selector}:hover {\n`;
                const file = item.hover;
                cssRule += `  background-image: url(${csspath}/${file});\n`; // Đường dẫn tới ảnh
                cssRule += `}\n`;

                cssContent += cssRule;
            }
        });
    }

    if (config.variables && Object.keys(config.variables).length > 0) {
        let rootVariables = "\n:root {\n";
        Object.keys(config.variables).forEach(key => {
            let value = config.variables[key];
            rootVariables += `  --cssprefix-${key}: ${value};\n`;
        });
        rootVariables += "}\n";

        cssContent += rootVariables;
    }

    createFolder("src/.setting/css");
    if (cssContent) {
        fs.writeFileSync("src/.setting/css/style.css", cssContent, "utf8");
        const importScript = `${comment}\nimport "./style.css"; \nexport default {}`;
        fs.writeFileSync("src/.setting/css/index.js", importScript, "utf8");
    } else {
        fs.writeFileSync("src/.setting/css/style.css", "", "utf8");
        const importScript = `${comment}\nexport default {}`;
        fs.writeFileSync("src/.setting/css/index.js", importScript, "utf8");
    }

})();


// Function to generate .setting/resource/index.js
(function () {
    const files = fs.readdirSync("src/lib/culture");
    const imports = [];
    const exports = [];

    files.forEach(file => {
        if (file.endsWith('.js')) {
            const baseName = path.basename(file, '.js');
            imports.push(`import ${baseName} from "@lib/culture/${file}";`);
            exports.push(baseName);
        }
    });

    const content = `${comment}\n${imports.join('\n')}\nexport default { ${exports.join(', ')} };`;
    createFolder("src/.setting/resource");
    fs.writeFileSync("src/.setting/resource/index.js", content);
    console.log('resource has been generated successfully.');
})();


//funcation to generate config
(function () {
    const files = fs.readdirSync("src/lib/culture");
    const imports = [];
    const exports = [];

    files.forEach(file => {
        if (file.endsWith('.js')) {
            const baseName = path.basename(file, '.js');
            imports.push(`import ${baseName} from "@lib/culture/${file}";`);
            exports.push(baseName);
        }
    });
    let configEnv = mode;
    if (configEnv === "fake") {
        configEnv = "dev";
    }
    const content = `${comment}\nimport config from '@lib/config/${configEnv}.js';\nexport default config;`;
    createFolder("src/.setting/config");
    fs.writeFileSync("src/.setting/config/index.js", content);
    console.log('config has been generated successfully.');
})();