import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const portfolioUrl = process.env.VITE_PORTFOLIO_MFE_URL || 'http://localhost:3001';
const riskUrl = process.env.VITE_RISK_MFE_URL || 'http://localhost:3002';
const alertsUrl = process.env.VITE_ALERTS_MFE_URL || 'http://localhost:3003';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        portfolio_mfe: {
          type: 'module',
          name: 'portfolio_mfe',
          entry: `${portfolioUrl}/remoteEntry.js`,
        },
        risk_mfe: {
          type: 'module',
          name: 'risk_mfe',
          entry: `${riskUrl}/remoteEntry.js`,
        },
        alerts_mfe: {
          type: 'module',
          name: 'alerts_mfe',
          entry: `${alertsUrl}/remoteEntry.js`,
        },
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT || 3100),
    strictPort: true,
  },
  preview: {
    port: Number(process.env.PORT || 3100),
    strictPort: true,
  },
  build: {
    target: 'chrome89',
    minify: false,
    cssCodeSplit: false,
  },
});
