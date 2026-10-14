import React from 'react';
import ReactDOM from 'react-dom/client';
import { AlertsApp } from './AlertsApp';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div className="p-8 max-w-7xl mx-auto">
        <AlertsApp isStandalone={true} />
      </div>
    </React.StrictMode>
  );
}
