import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

// Xác định __dirname trong ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Phục vụ file tĩnh từ thư mục "public"
app.use(express.static(path.join(__dirname, 'public')));


// Lắng nghe trên cổng 3000
const server =  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Trying another port...`);
        const newPort = port + 1;
        app.listen(newPort, () => {
            console.log(`Server is now running on http://localhost:${newPort}`);
        });
    } else {
        console.error('Server error:', err);
    }
});