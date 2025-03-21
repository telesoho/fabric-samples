import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { from, logger } from 'env-var';

// const parsed = dotenv.parse(fs.readFileSync('.env', { encoding: 'utf8'}))
const env = from(process.env, {}, logger);

/**
 * Log level for the REST server
 */
export const logLevel = env
  .get('LOG_LEVEL')
  .default('info')
  .asEnum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

/**
 * The port to start the REST server on
 */
export const port = env
  .get('PORT')
  .default('3000')
  .example('3000')
  .asPortNumber();
