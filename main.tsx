import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { loadRuntimeConfig } from './services/runtimeConfig';
import { initFrontendSentry } from './services/sentry';

const savedTheme = window.localStorage.getItem('tunibots-theme');
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark', savedTheme === 'dark' || (!savedTheme && prefersDark));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const bootstrap = async () => {
  const runtimeConfig = await loadRuntimeConfig();
  initFrontendSentry(runtimeConfig);

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void bootstrap();
