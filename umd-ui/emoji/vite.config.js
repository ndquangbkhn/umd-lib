import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import postcss from 'rollup-plugin-postcss';
import { renameUMD, makeTest } from './vite-plugin/bundle.js';
import replace from '@rollup/plugin-replace';
import VitePluginString from 'vite-plugin-string';
import path from 'path';

const config = require('./lib.config.json');
const version = config.version;
const isDev = process.env.NODE_ENV === 'development';
const cssprefix = isDev ? "cssprefix" : config.cssprefix;
const fileName = `${config.name}-${version}`;
export default defineConfig({
  plugins: [
    VitePluginString({
      include: [path.resolve(__dirname, 'src/lib/') + '**/*.html'],
      compress: true,
    }),

    replace({
      preventAssignment: true,
      values: {
        cssprefix: cssprefix, // Thay thế từ giá trị trong config.json,
      },
    }),
    renameUMD(),
    makeTest({
      dirName: path.resolve(__dirname),
      replacements: {
        _FILE_JS_NAME_: `${fileName}.min.js`,
        _FILE_CSS_NAME_: `${fileName}.min.css`,
        _VERSION_: version,
        _OBJECT_NAME_: config.global
      }
    }),

    vue()
  ],
  root: isDev ? path.resolve(__dirname, 'src/ui') : undefined, // Chỉ định thư mục root cho Vite
  server: {
    open: true, // Tự động mở trình duyệt khi chạy `npm run dev`
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    lib: isDev ? undefined : {
      entry: './src/lib/main.js',
      name: config.global,
      formats: ['umd'],
      fileName: (format) => `${fileName}.${format}.js`
    },
    rollupOptions: isDev ? { external: ['vue'], output: { globals: { vue: 'Vue', } }, } : {
      plugins: [
        postcss({ extract: false }),  // Không tạo file css umd riêng
      ],
      output: {
        //taoj file css
        assetFileNames: (assetInfo) => {
          console.log(assetInfo.name);
          if (assetInfo.name.endsWith('.css')) {
            return `${fileName}.min.css`;
          }
          return 'assets/[name][extname]'; // Các file khác
        },

      },
    }
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      '@setting': path.resolve('./src/.setting'),
      '@resource': path.resolve('./src/.setting/resource'),
      '@config': path.resolve('./src/.setting/config'),
      '@core': path.resolve('./src/core'),
      '@lib': path.resolve('./src/lib'),
      '@data': path.resolve('./src/lib/data'),
      '@ui': path.resolve('./src/ui'),
    },
  },

});
