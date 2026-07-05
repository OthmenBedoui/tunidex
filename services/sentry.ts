import * as Sentry from '@sentry/react';
import type { RuntimeConfig } from './runtimeConfig';

let initialized = false;

export const initFrontendSentry = (config: RuntimeConfig) => {
  if (initialized || !config.sentryDsn) return;
  initialized = true;

  Sentry.init({
    dsn: config.sentryDsn,
    environment: import.meta.env.MODE
  });
};

export { Sentry };
