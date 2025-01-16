//Function to generate .setting/service/index.js
import fs from "fs";
import path from "path";
import parser  from '@babel/parser';


// Function to generate .setting/resource/index.js
function loadExportByPath(fodlerPath) {
    const files = fs.readdirSync(fodlerPath);
    // Lọc ra chỉ các file .js
    const jsFiles = files.filter(file => file.endsWith('.js') && file !== 'index.js');
    let indexContent = "";


    jsFiles.forEach(file => {
        const fileNameWithoutExtension = path.basename(file, '.js');
        // Kiểm tra xem file có export default không
        const filePath = path.join(fodlerPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const ast = parser.parse(fileContent, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        let defaultExportName = null;

        ast.program.body.forEach(node => {
            if (node.type === 'ExportDefaultDeclaration') {
                if (node.declaration.type === 'Identifier') {
                    // Default export là một biến hoặc hàm
                    defaultExportName = node.declaration.name;
                } else if (node.declaration.type === 'FunctionDeclaration' || node.declaration.type === 'ClassDeclaration') {
                    // Default export là một hàm hoặc lớp
                    defaultExportName = node.declaration.id.name;
                }
            }
        });

        if (defaultExportName) {
            // Nếu tìm thấy default export, sử dụng tên đó
            indexContent += `export { default as ${defaultExportName} } from './${fodlerPath}/${fileNameWithoutExtension}';\n`;
        } else {
            // Nếu không có default export, thêm các named exports
            indexContent += `export * from './${fodlerPath}/${fileNameWithoutExtension}';\n`;
        }
    });

    return indexContent;
}


let contentArr = [];
contentArr.push(loadExportByPath('src'));

console.log(contentArr.join('\n'));
console.log('index.js has been generated successfully.');

