import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { App } from './App';
import './index.css';
import { initCorrelationInterceptor } from './telemetry/correlation';
import { initWebVitals } from './telemetry/web-vitals';

// Initialize distributed correlation ID tracing & Core Web Vitals RUM reporting
initCorrelationInterceptor();
initWebVitals();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
}
