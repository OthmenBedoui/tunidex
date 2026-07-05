import * as Sentry from '@sentry/node';
import env from './config/env.js';
import logger from './logger.js';

let initialized = false;
let processHandlersRegistered = false;

export const initServerMonitoring = () => {
  if (initialized) return;
  initialized = true;

  if (env.sentryDsn) {
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.nodeEnv
    });
    logger.info({ sentryEnabled: true }, 'server_monitoring_initialized');
  } else {
    logger.info({ sentryEnabled: false }, 'server_monitoring_initialized');
  }
};

export const captureServerException = async (error: unknown, context?: Record<string, unknown>) => {
  if (!env.sentryDsn) return;

  Sentry.withScope((scope) => {
    Object.entries(context || {}).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(typeof error === 'string' ? error : 'Non-error exception captured');
    }
  });

  await Sentry.flush(2000);
};

export const registerProcessErrorHandlers = () => {
  if (processHandlersRegistered) return;
  processHandlersRegistered = true;

  process.on('unhandledRejection', async (reason) => {
    logger.error({ err: reason }, 'unhandled_promise_rejection');
    await captureServerException(reason, { origin: 'process.unhandledRejection' });
  });

  process.on('uncaughtException', async (error) => {
    logger.fatal({ err: error }, 'uncaught_exception');
    await captureServerException(error, { origin: 'process.uncaughtException' });
    process.exit(1);
  });
};

export { Sentry };
