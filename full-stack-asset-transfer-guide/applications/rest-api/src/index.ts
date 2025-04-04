import { logger } from './logger';
import app from "./app";
import * as config from './config';
import { Connection } from './connection';
 
async function main() {

  logger.info('Starting REST server');

  // Override console.debug to be a no-op when log level is not debug
  if (config.logLevel !== 'debug') {
    console.debug = () => {};
  }

  await new Connection(app).init();

  const server = app.listen(config.port,() => {
    logger.info('REST server started on port: %d', config.port);
  });


  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, closing server`);
    
    server.close(async () => {
      logger.info('Server closed');
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM')); 
}

main().catch(async (err) => {
  logger.error({ err }, 'Unexpected error');
});
