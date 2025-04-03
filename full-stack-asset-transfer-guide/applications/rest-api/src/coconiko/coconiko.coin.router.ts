import express, { Request, Response } from 'express';
import { body, query } from 'express-validator';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoCoin } from './coconiko-coin';
import { validateRequest } from '../middlewares/validation.middleware';
import { handleError } from '../errors';
import { getCoconikoCoinContract } from '../connection';

const { OK } = StatusCodes;
const router = express.Router();

// Utility functions
const parseDate = (pDate: any): Date | undefined => {
  return pDate instanceof Date ? pDate : undefined;
};

const parseOptionalInt = (value: any): number | undefined => {
  return value ? parseInt(value) : undefined;
};

// Common validators
const dateRangeValidators = [
  query('startDate').optional().isISO8601().toDate().withMessage('Must be a valid ISO8601 date'),
  query('endDate').optional().isISO8601().toDate().withMessage('Must be a valid ISO8601 date')
];


router.post(
  '/Mint',
  body().isObject().withMessage('body must be an object'),
  body('amount', '{Integer} amount amount of tokens to be minted').notEmpty(),
  body('days', '{Integer} expired days').optional().default(180),
  validateRequest,
  async (req: Request, res: Response) => {
    logger.debug(req.body);
    try {
      const { amount, days } = req.body;
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.Mint(amount, days);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.post(
  '/BurnExpired',
  body().isObject().withMessage('body must be an object'),
  body('owner', 'must be a string').notEmpty(),
  body('expirationDate').isISO8601().withMessage('Must be a valid ISO8601 date'),
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { owner, expirationDate } = req.body;
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.burnExpired(owner, expirationDate);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

// Balance and Transfer Routes
router.post(
  '/BalanceOf',
  body('owners', 'Must be an string array of account id for whom to query the balance, min 0, max 1000').isArray({ min: 0, max: 1000 }),
  validateRequest,
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Balance of owners');
    try {
      const owners: string[] = req.body.owners;
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.BalanceOf(owners);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.post(
  '/Transfer',
  body().isObject().withMessage('body must be an object'),
  body('to', 'must be a string').notEmpty(),
  body('amount').isInt().notEmpty(),
  validateRequest,
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Transfer');
    try {
      const { to, amount } = req.body;
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.Transfer(to, amount);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.post(
  '/TransferFrom',
  body().isObject().withMessage('body must be an object'),
  body('from', 'must be a string').notEmpty(),
  body('to', 'must be a string').notEmpty(),
  body('amount').isInt().notEmpty(),
  validateRequest,
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'TransferFrom');
    try {
      const { from, to, amount } = req.body;
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.TransferFrom(from, to, amount);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

// Reporting and Statistics Routes
router.get(
  '/TotalSupply',
  [...dateRangeValidators, query('activeUserOnly').optional().isBoolean().withMessage('Must be a boolean')],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const startDate = parseDate(req.query.startDate);
      const endDate = parseDate(req.query.endDate);
      const activeUserOnly = req.query.activeUserOnly === 'true' || req.query.activeUserOnly === undefined;
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.getTotalSupply(startDate, endDate, activeUserOnly);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.get(
  '/ClientAccountEventHistory',
  [
    ...dateRangeValidators,
    query('pageSize').optional().isInt().withMessage('Must be an integer'),
    query('skip').optional().isInt().withMessage('Must be an integer')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const startDate = parseDate(req.query.startDate);
      const endDate = parseDate(req.query.endDate);
      const pageSize = parseOptionalInt(req.query.pageSize);
      const skip = parseOptionalInt(req.query.skip);
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.getClientAccountEventHistory(startDate, endDate, pageSize, skip);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.get(
  '/ClientAccountEventHistory/Count',
  dateRangeValidators,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const startDate = parseDate(req.query.startDate as string | undefined);
      const endDate = parseDate(req.query.endDate as string | undefined);
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.getClientAccountEventHistoryCount(startDate, endDate);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

router.get(
  '/Summary',
  dateRangeValidators,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const startDate = parseDate(req.query.startDate as string | undefined);
      const endDate = parseDate(req.query.endDate as string | undefined);
      
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.getSummary(startDate, endDate);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

export { router as assetsRouter };