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
});
