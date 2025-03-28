import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import * as config from '../config';
import { CoconikoCoin } from './coconiko-coin';

const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, NOT_FOUND } = StatusCodes;
const assetsRouter = express.Router();

// Create new user
assetsRouter.put(
  '/user',
  body().isObject().withMessage('body must contain an user object'),
  body(
    'username',
    'user name you wish to register. must be a string'
  ).notEmpty(),
  body('role', 'role').notEmpty(),
  async (req: Request, res: Response) => {
    logger.debug('Register and enroll user to fabric network');
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(BAD_REQUEST).json({
          status: getReasonPhrase(BAD_REQUEST),
          reason: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          timestamp: new Date().toISOString(),
          errors: errors.array(),
        });
      }

      const { username, role } = req.body;
      
      const coinService = new CoconikoCoin(undefined);
      const result = await coinService.registerUser(username, role);
      
      return res.status(OK).json(result);
    } catch (err) {
      logger.error({ err }, 'Error processing create user');
      if (req.app.get('env') === 'development') {
        let message = err;
        if (err instanceof Error) {
          message = err.message;
        }
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: message,
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(INTERNAL_SERVER_ERROR).json({
        status: getReasonPhrase(INTERNAL_SERVER_ERROR),
        timestamp: new Date().toISOString(),
      });
    }
  }
);

assetsRouter.post('/user',
  body().isObject().withMessage('body must be an object'),
  body('active', '{Boolean} activation status of the user').isBoolean().toBoolean().notEmpty(),
  async (req: Request, res: Response) => {
    try {
      logger.debug(req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(BAD_REQUEST).json({
          status: getReasonPhrase(BAD_REQUEST),
          reason: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          timestamp: new Date().toISOString(),
          errors: errors.array(),
        });
      }
      
      const userId = req.user as string;
      const { active } = req.body;
      
      const coinService = new CoconikoCoin(undefined);
      const result = await coinService.updateUser(userId, active);
      
      return res.status(OK).json({ result });
    } catch (err) {
      logger.error({ err }, req.url);
      if (req.app.get('env') === 'development') {
        let message = err;
        if (err instanceof Error) {
          message = err.message;
        }
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: message,
          timestamp: new Date().toISOString(),
        });
      }
      return res.status(INTERNAL_SERVER_ERROR).json({
        status: getReasonPhrase(INTERNAL_SERVER_ERROR),
        timestamp: new Date().toISOString(),
      });
    }
  });

assetsRouter.get('/user', async (req: Request, res: Response) => {
  try {
    const userId = req.user as string;
    
    const coinService = new CoconikoCoin(undefined);
    const result = await coinService.getUserInfo(userId);
    
    return res.status(OK).json({ result });
  } catch (err) {
    logger.error({ err }, req.url);
    if (req.app.get('env') === 'development') {
      let message = err;
      if (err instanceof Error) {
        message = err.message;
      }
      return res.status(INTERNAL_SERVER_ERROR).json({
        status: message,
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

export { assetsRouter };