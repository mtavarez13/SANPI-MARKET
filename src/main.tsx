import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global resilience handler for iframe IndexedDB tear-down and speech aborts
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = (reason && (reason.message || String(reason))) || '';
    if (
      msg.includes('IDBDatabase') ||
      msg.includes('database connection is closing') ||
      msg.includes('AbortError') ||
      msg.includes('The operation was aborted')
    ) {
      // Prevent noisy crash in iframe preview when database is closing or re-opening
      event.preventDefault();
      console.debug('Handled transient background event:', msg);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (
      msg.includes('IDBDatabase') ||
      msg.includes('database connection is closing') ||
      msg.includes('AbortError')
    ) {
      event.preventDefault();
      console.debug('Handled transient error:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
