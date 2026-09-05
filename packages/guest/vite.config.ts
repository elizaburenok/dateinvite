import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Гость-страница живёт по адресу /i/<token>, поэтому base совпадает с префиксом. */
export default defineConfig({
  base: '/i/',
  plugins: [react()],
  server: {
    // Порт задаёт окружение: собственный адрес дев-сервера ни на что
    // не завязан, а фиксированный номер конфликтует с соседними запусками.
    port: Number(process.env.PORT) || 5174,
    proxy: {
      '/api': process.env.API_TARGET || 'http://localhost:3000',
      '/media': process.env.API_TARGET || 'http://localhost:3000',
    },
  },
});
