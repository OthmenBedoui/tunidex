import pino from 'pino';
import env from './config/env.js';

export const logger = pino({
  level: env.logLevel,
  base: {
    service: 'tunibots-server',
    env: env.nodeEnv
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

export default logger;
