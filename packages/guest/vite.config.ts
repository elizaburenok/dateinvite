import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Гость-страница живёт по адресу /i/<token>, поэтому base совпадает с префиксом. */
export default defineConfig({
  base: '/i/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
    },
  },
});
