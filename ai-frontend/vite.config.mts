import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,tsx}',
    }),
  ],
  server: {
    host: true,
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      protocol: 'wss',
      clientPort: 443,
    },
    watch: {
      usePolling: true,
      interval: 800,
    },
  },
  optimizeDeps: {},
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    minify: 'esbuild',
    target: 'es2022',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
            return 'vendor-editor';
          }

          if (id.includes('lucide-react') || id.includes('@tabler/icons-react')) {
            return 'vendor-icons';
          }

          if (id.includes('react-syntax-highlighter')) {
            return 'vendor-highlighter';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('date-fns')) {
            return 'vendor-time';
          }

          if (id.includes('jspdf')) {
            return 'vendor-export';
          }

          if (/[\\/]firebase[\\/]/.test(id)) {
            return 'vendor-firebase';
          }

          if (id.includes('@tanstack/') || id.includes('swr')) {
            return 'vendor-data';
          }

          return 'vendor';
        },
      },
    },
  },
});
