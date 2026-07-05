import logger from './logger.js';
import { initServerMonitoring, registerProcessErrorHandlers } from './monitoring.js';
import { startServer } from './app.js';

initServerMonitoring();
registerProcessErrorHandlers();

startServer().catch((error) => {
  logger.fatal({ err: error }, 'server_start_failed');
  process.exit(1);
});
