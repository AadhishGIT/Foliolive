import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'portfolio_mfe',
      filename: 'remoteEntry.js',
      manifest: true,
      exposes: {
        './PortfolioApp': './src/PortfolioApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  server: {
    port: 3001,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 3001,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'chrome89',
    minify: false,
    cssCodeSplit: false,
  },
});
