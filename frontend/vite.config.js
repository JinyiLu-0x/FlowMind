import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 指向 .jsx shim
      'lucide-react': path.resolve(__dirname, 'src/lucide-react.jsx'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        secure: false,
        // 不强制覆盖 Origin，避免 Vite 随机端口导致不一致
      }
    }
  }
});
