import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoDebug } from './coconiko-debug';
import { validateRequest } from '../middlewares/validation.middleware';
import { handleError } from '../errors';
import { getCoconikoCoinContract } from '../connection';
 
const { BAD_REQUEST, OK } = StatusCodes;
const assetsRouter = express.Router();

assetsRouter.post(
  '/queryAssetsWithPagination',
  body().isObject().withMessage('body must be an object'),
  body('query', 'must be a object').isObject().notEmpty(),
  body('pageSize', 'must be a interger').isInt().notEmpty(),
  body('bookmark', 'must be a string'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { query, pageSize, bookmark = "" } = req.body;
      
      const service = new CoconikoDebug(getCoconikoCoinContract(req));
      const result = await service.queryAssetsWithPagination(query, pageSize, bookmark);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

assetsRouter.post(
  '/postgres/query',
  body().isObject().withMessage('body must be an object'),
  body('queryString', 'must be a valid SQL SELECT statement').isString().notEmpty(),
  body('params', 'must be an object').optional().isObject(),
  validateRequest,
  async (req: Request, res: Response) => {
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

      const service = new CoconikoDebug(getCoconikoCoinContract(req));
      const result = await service.executePostgresQuery(queryString, params);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

export { assetsRouter };