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
      // TODO: Implement
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
  body('active', '{Boolean} amount amount of tokens to be minted').isBoolean().toBoolean().notEmpty(),
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
      // TODO: Implement
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
    // TODO: Implement
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

assetsRouter.post(
  '/Mint',
  body().isObject().withMessage('body must be an object'),
  body('amount', '{Integer} amount amount of tokens to be minted').notEmpty(),
  body('days', '{Integer} expired days').optional().default(180),
  async (req: Request, res: Response) => {
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

    try {
      const userId = req.user as string;
      const { amount, days } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.mintCoin(userId, amount, days);
      
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
  }
);

assetsRouter.post(
  '/BalanceOf',
  body('owners', 'Must be an string array of account id for whom to query the balance, min 0, max 1000').isArray({ min: 0, max: 1000 }),
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Balance of owners');
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
    try {
      const { owners } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.getBalances(owners);
      
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
  }
);

assetsRouter.post(
  '/Transfer',
  body().isObject().withMessage('body must be an object'),
  body('to', 'must be a string').notEmpty(),
  body('amount').isInt().notEmpty(),
  async (req: Request, res: Response) => {
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

    try {
      const userId = req.user as string;
      const { to, amount } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.transfer(userId, to, amount);
      
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
  }
);

assetsRouter.post(
  '/TransferFrom',
  body().isObject().withMessage('body must be an object'),
  body('from', 'must be a string').notEmpty(),
  body('to', 'must be a string').notEmpty(),
  body('amount').isInt().notEmpty(),
  async (req: Request, res: Response) => {
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

    try {
      const adminUserId = req.user as string;
      const { from, to, amount } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.transferFrom(adminUserId, from, to, amount);
      
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
  }
);

assetsRouter.get(
  '/TotalSupply',
  query('startDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('activeUserOnly').optional().isBoolean().withMessage('Must be a boolean'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const activeUserOnly = req.query.activeUserOnly === 'true' || req.query.activeUserOnly === undefined;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.getTotalSupply(startDate, endDate, activeUserOnly);
      
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
  }
);

assetsRouter.post(
  '/BurnExpired',
  body().isObject().withMessage('body must be an object'),
  body('owner', 'must be a string').notEmpty(),
  body('expirationDate').isISO8601().withMessage('Must be a valid ISO8601 date'),
  async (req: Request, res: Response) => {
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

    try {
      const { owner, expirationDate } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.burnExpired(owner, expirationDate);
      
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
  }
);

assetsRouter.get(
  '/ClientAccountEventHistory',
  query('startDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('pageSize').optional().isInt().withMessage('Must be an integer'),
  query('skip').optional().isInt().withMessage('Must be an integer'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    try {
      const userId = req.user as string;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
      const skip = req.query.skip ? parseInt(req.query.skip as string) : undefined;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.getClientAccountEventHistory(userId, startDate, endDate, pageSize, skip);
      
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
  }
);

assetsRouter.get(
  '/ClientAccountEventHistory/Count',
  query('startDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    try {
      const userId = req.user as string;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.getClientAccountEventHistoryCount(userId, startDate, endDate);
      
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
  }
);

assetsRouter.get(
  '/Summary',
  query('startDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('Must be a valid ISO8601 date'),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.getSummary(startDate, endDate);
      
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
  }
);

assetsRouter.post(
  '/queryAssetsWithPagination',
  body().isObject().withMessage('body must be an object'),
  body('query', 'must be a object').isObject().notEmpty(),
  body('pageSize', 'must be a interger').isInt().notEmpty(),
  body('bookmark', 'must be a string'),
  async (req: Request, res: Response) => {
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
    try {
      // TODO: Implement
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
  }
);

export { assetsRouter };