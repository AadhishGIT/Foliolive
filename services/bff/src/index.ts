import { createBffServer } from './server';
import { config } from './config';
import { logger } from './logger';

const bff = createBffServer({
  seed: config.simulator.defaultSeed,
  defaultIntervalMs: config.simulator.defaultTickIntervalMs,
});

bff.start(config.port).catch((err) => {
  logger.fatal({ err: err.message }, 'Failed to start BFF server');
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down BFF server gracefully...');
  await bff.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
