import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/** Mini App раздаётся по /app/, поэтому base совпадает с префиксом. */
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        pastelShaderDemo: fileURLToPath(new URL('./pastel-shader-demo.html', import.meta.url)),
        sendShadowDemos: fileURLToPath(new URL('./send-shadow-demos.html', import.meta.url)),
        envelopeTitleDemos: fileURLToPath(new URL('./envelope-title-demos.html', import.meta.url)),
        pickedMotion: fileURLToPath(new URL('./picked-motion.html', import.meta.url)),
        sheetMotion: fileURLToPath(new URL('./sheet-motion.html', import.meta.url)),
        recollectSheetDemo: fileURLToPath(new URL('./recollect-sheet-demo.html', import.meta.url)),
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        libraryGrowthDemos: fileURLToPath(new URL('./library-growth-demos.html', import.meta.url)),
        checkboxOptions: fileURLToPath(new URL('./checkbox-options.html', import.meta.url)),
        libraryDemos: fileURLToPath(new URL('./library-demos.html', import.meta.url)),
        stackDemos: fileURLToPath(new URL('./stack-demos.html', import.meta.url)),
        feedPreview: fileURLToPath(new URL('./feed-preview.html', import.meta.url)),
        homePreview: fileURLToPath(new URL('./home-preview.html', import.meta.url)),
        surfaceDemos: fileURLToPath(new URL('./surface-demos.html', import.meta.url)),
        paletteDemos: fileURLToPath(new URL('./palette-demos.html', import.meta.url)),
        veilDemos: fileURLToPath(new URL('./veil-demos.html', import.meta.url)),
      },
    },
  },
  server: {
    // Порт задаёт окружение: собственный адрес дев-сервера ни на что
    // не завязан, а фиксированный номер конфликтует с соседними запусками.
    port: Number(process.env.PORT) || 5175,
    proxy: {
      '/api': process.env.DEV_API_URL || 'http://localhost:3000',
      '/media': process.env.DEV_API_URL || 'http://localhost:3000',
    },
  },
});
