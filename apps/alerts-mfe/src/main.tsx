import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlertsApp } from './AlertsApp';
import { ThemeProvider } from '@foliolive/ui';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-7xl mx-auto font-sans">
          <AlertsApp isStandalone={true} />
        </div>
      </ThemeProvider>
    </React.StrictMode>
  );
}
