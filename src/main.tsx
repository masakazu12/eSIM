import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Suppress unhandled rejections and window errors originating from injected browser extensions (e.g. MetaMask, Web3 inpage scripts)
if (typeof window !== 'undefined') {
  const isExtensionError = (msg?: string, filename?: string, stack?: string) => {
    const combined = `${msg || ''} ${filename || ''} ${stack || ''}`.toLowerCase();
    return (
      combined.includes('metamask') ||
      combined.includes('chrome-extension://') ||
      combined.includes('moz-extension://') ||
      combined.includes('safari-extension://') ||
      combined.includes('failed to connect to metamask') ||
      combined.includes('inpage.js') ||
      combined.includes('ethereum') ||
      combined.includes('evmproviders')
    );
  };

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';
      const stack = reason?.stack || '';
      if (isExtensionError(msg, '', stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg = event.message || '';
      const filename = event.filename || '';
      const stack = event.error?.stack || '';
      if (isExtensionError(msg, filename, stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
