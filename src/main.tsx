import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and safely suppress benign ResizeObserver loop warning messages from polluting the browser context
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    if (
      e.message && 
      (e.message.toLowerCase().includes('resizeobserver loop limit exceeded') ||
       e.message.toLowerCase().includes('resizeobserver loop completed'))
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
