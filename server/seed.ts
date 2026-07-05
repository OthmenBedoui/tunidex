import logger from './logger.js';
import { seedDatabase } from './utils/seeder.js';

seedDatabase()
  .then(() => {
    logger.info('database_seed_completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ err: error }, 'database_seed_failed');
    process.exit(1);
  });
