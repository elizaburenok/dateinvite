import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Mini App раздаётся по /app/, поэтому base совпадает с префиксом. */
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  server: {
    // Порт задаёт окружение: собственный адрес дев-сервера ни на что
    // не завязан, а фиксированный номер конфликтует с соседними запусками.
    port: Number(process.env.PORT) || 5175,
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
    },
  },
});
