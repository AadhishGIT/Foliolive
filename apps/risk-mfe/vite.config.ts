import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig(({ command, mode }) => {
  const isProd = command === 'build' || mode === 'production';
  return {
    base: process.env.VITE_BASE || (isProd ? '/risk-mfe/' : '/'),
    plugins: [
      react(),
      federation({
        name: 'risk_mfe',
        filename: 'remoteEntry.js',
        manifest: true,
        exposes: {
          './RiskApp': './src/RiskApp.tsx',
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
        },
      }),
    ],
    server: {
      port: 3002,
      strictPort: true,
      cors: true,
    },
    preview: {
      port: 3002,
      strictPort: true,
      cors: true,
    },
    build: {
      target: 'chrome89',
      minify: false,
      cssCodeSplit: false,
    },
  };
});
