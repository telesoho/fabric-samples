import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoCoin } from './coconiko-coin';

const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, NOT_FOUND } = StatusCodes;
const assetsRouter = express.Router();

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
      const { query, pageSize, bookmark = "" } = req.body;
      
      const coinService = new CoconikoCoin();
      const result = await coinService.queryAssetsWithPagination(query, pageSize, bookmark);
      
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
  '/postgres/query',
  body().isObject().withMessage('body must be an object'),
  body('queryString', 'must be a valid SQL SELECT statement').isString().notEmpty(),
  body('params', 'must be an object').optional().isObject(),
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
      const { queryString, params = {} } = req.body;
      
      // Validate it's a SELECT query for security
      if (!queryString.trim().toLowerCase().startsWith('select')) {
        return res.status(BAD_REQUEST).json({
          status: getReasonPhrase(BAD_REQUEST),
          reason: 'VALIDATION_ERROR',
          message: 'Invalid SQL query - only SELECT statements are allowed',
          timestamp: new Date().toISOString(),
          errors: [{ msg: 'Query must be a SELECT statement', param: 'queryString' }]
        });
      }
      
      const coinService = new CoconikoCoin();
      const result = await coinService.executePostgresQuery(queryString, params);
      
      return res.status(OK).json({ result });
    } catch (err) {
      logger.error({ err }, 'PostgreSQL query failed');
      if (req.app.get('env') === 'development') {
        return res.status(INTERNAL_SERVER_ERROR).json({
          status: err instanceof Error ? err.message : 'Unknown error',
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