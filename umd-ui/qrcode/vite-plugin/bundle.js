import fs from 'fs-extra';
import path from 'path';

export function renameUMD() {
    return {
        name: 'rename-files',
        generateBundle(options, bundle) {
            for (const fileName in bundle) {
                console.log("generateBundle", fileName);
                if (fileName.endsWith('.umd.js')) {
                    const newFileName = fileName.replace('.umd.js', '.min.js');
                    bundle[newFileName] = { ...bundle[fileName], fileName: newFileName };
                    delete bundle[fileName]; // Xóa file cũ
                }
            }
        },
    };
}

async function makeIndexHTML(testDir, buildDir, replacements) {
    try {
        // Đọc nội dung của file test.html
        const filePath = path.join(testDir, "public" ,'test.html');
        let content = await fs.readFile(filePath, 'utf-8');

        // Thực hiện thay thế các chuỗi theo đối tượng replacements
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key, 'g');  // Sử dụng RegExp để thay thế tất cả các lần xuất hiện
            content = content.replace(regex, value);
        }

        // Ghi lại nội dung đã thay thế vào file index.html
        const outputFilePath = path.join(buildDir, "public" ,'index.html');
        await fs.writeFile(outputFilePath, content, 'utf-8');

        console.log('File index.html has been created with the replacements!');
    } catch (err) {
        console.error('Error:', err);
    }
}


export function makeTest({ dirName, replacements }) {
    return {
        name: 'copy-to-release',
        // Sử dụng hook buildEnd để sao chép file sau khi build xong
        async closeBundle() {
            const distDir = path.resolve(dirName, 'dist');
            const testDir = path.resolve(dirName, 'test');
            const buildDir = path.resolve(dirName, 'build');
            const buildSrcDir = path.resolve(buildDir, 'public');

            fs.emptyDirSync(buildDir);
            await fs.copy(distDir, buildSrcDir)
            try {
                const files = [
                    "public/test.js",
                    "app.js"
                ];

                // Duyệt qua tất cả các file trong thư mục dist
                for (const file of files) {
                    const sourceFilePath = path.join(testDir, file);
                    const targetFilePath = path.join(buildDir, file);
                    await fs.copy(sourceFilePath, targetFilePath, { overwrite: true });
                }

                console.log('Files copied and modified successfully!');
            } catch (err) {
                console.error('Error copying files:', err);
            }
            makeIndexHTML(testDir, buildDir, replacements);
        },
    };
}
