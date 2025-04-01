import { logger } from './logger';
import app from "./app";
import * as config from './config';
import { buildCAClient, createWallet } from './fabric-helper/ca_util';
import { enrollAdmin } from './fabric-helper/ca_util';
 
async function main() {
  logger.info('Creating REST server');

  logger.info('Connecting to Fabric network with mspid');
  const wallet = await createWallet();

  app.locals.wallet = wallet;

  // build an instance of the fabric ca services client based on
  // the information in the network configuration
  const caClient = buildCAClient();

  // in a real application this would be done on an administrative flow, and only once
  // TODO: need to reenroll
  await enrollAdmin(caClient, wallet, config.orgMSPID);

  logger.info('Starting REST server');
  const server = app.listen(config.port, "0.0.0.0",() => {
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
  logger.error({ err }, 'Unxepected error');
});
