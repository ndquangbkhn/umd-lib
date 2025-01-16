//Function to generate .setting/service/index.js
import fs from "fs";
import path from "path";
const comment = `//This file is auto-generated. Do not edit directly.`;



// Function to generate .setting/resource/index.js
function loadExportByPath(fodlerPath) {
    const files = fs.readdirSync(fodlerPath);
    // Lọc ra chỉ các file .js
    const jsFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
    let indexContent = "";


    jsFiles.forEach(file => {
        const fileNameWithoutExtension = path.basename(file, '.js');
        const fileNameCapitalized = fileNameWithoutExtension.charAt(0).toUpperCase() + fileNameWithoutExtension.slice(1);

        // Kiểm tra xem file có export default không
        const filePath = path.join(fodlerPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        if (fileContent.includes('export default')) {
            // Nếu có export default, thêm vào index.js với tên đã viết hoa chữ đầu
            indexContent += `export { default as ${fileNameCapitalized} } from './${fodlerPath}/${fileNameWithoutExtension}';\n`;
        } else {
            // Nếu không có export default, thêm các named exports
            indexContent += `export * from './${fodlerPath}/${fileNameWithoutExtension}';\n`;
        }
    });

    return indexContent;
}

let paths = [
    "src/base",
    "src/utils",
]

let contentArr = [];
paths.forEach(p => {
    contentArr.push(loadExportByPath(p));
});
fs.writeFileSync("index-autogen.js", contentArr.join('\n'));

console.log('index.js has been generated successfully.');
