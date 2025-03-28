/*
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from './logger';


const { SERVICE_UNAVAILABLE, OK } = StatusCodes;

export const healthRouter = express.Router();

/*
 * Example of possible health endpoints for use in a cloud environment
 */

healthRouter.get('/ready', (_req, res: Response) =>
  res.status(OK).json({
    status: getReasonPhrase(OK),
    timestamp: new Date().toISOString(),
  })
);

healthRouter.get('/live', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Liveness request received');

  try {
    // TODO: Implement
  } catch (err) {
    logger.error({ err }, 'Error processing liveness request');

    return res.status(SERVICE_UNAVAILABLE).json({
      status: getReasonPhrase(SERVICE_UNAVAILABLE),
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(OK).json({
    status: getReasonPhrase(OK),
    timestamp: new Date().toISOString(),
  });
});
