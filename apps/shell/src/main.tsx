import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { App } from './App';
import './index.css';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

// Report Core Web Vitals for RUM observability
const reportWebVitals = () => {
  onCLS((metric) => {
    // eslint-disable-next-line no-console
    console.info(`[Web Vital] CLS: ${metric.value.toFixed(4)}`, metric);
  });
  onINP((metric) => {
    // eslint-disable-next-line no-console
    console.info(`[Web Vital] INP: ${metric.value.toFixed(1)}ms`, metric);
  });
  onLCP((metric) => {
    // eslint-disable-next-line no-console
    console.info(`[Web Vital] LCP: ${metric.value.toFixed(1)}ms`, metric);
  });
  onFCP((metric) => {
    // eslint-disable-next-line no-console
    console.info(`[Web Vital] FCP: ${metric.value.toFixed(1)}ms`, metric);
  });
  onTTFB((metric) => {
    // eslint-disable-next-line no-console
    console.info(`[Web Vital] TTFB: ${metric.value.toFixed(1)}ms`, metric);
  });
};

reportWebVitals();

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
