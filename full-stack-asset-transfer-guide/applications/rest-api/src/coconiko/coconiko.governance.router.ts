import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { GovernanceToken } from './governance-token';

const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, NOT_FOUND } = StatusCodes;
const assetsRouter = express.Router();

assetsRouter.post(
  '/voting/MintProposal',
  body().isObject().withMessage('body must be an object'),
  body('proposalId', 'Proposal ID must be a non-empty string').isString().notEmpty(),
  body('title', 'Title must be a non-empty string').isString().notEmpty(),
  body('description', 'Description must be a string').optional().isString(),
  body('options', 'Options must be an array of strings with at least 2 items').isArray({ min: 2, max: 10 }),
  body('options.*', 'Each option must be a string').isString(),
  body('endDate', 'End date must be a valid ISO date').isISO8601(),
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
      const { proposalId, title, description = '', options, endDate } = req.body;
      
      const governanceService = new GovernanceToken();
      const result = await governanceService.createProposal(proposalId, title, description, options, endDate);
      
      return res.status(CREATED).json({ result });
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
  '/voting/MintVoteNFT',
  body().isObject().withMessage('body must be an object'),
  body('proposalId', 'Proposal ID must be a non-empty string').isString().notEmpty(),
  body('voterId', 'Voter ID must be a string').optional().isString(),
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
      const { proposalId, voterId } = req.body;
      
      const governanceService = new GovernanceToken();
      const result = await governanceService.mintVoteNFT(userId, proposalId, voterId);
      
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
  '/voting/Cast',
  body().isObject().withMessage('body must be an object'),
  body('proposalId', 'Proposal ID must be a non-empty string').isString().notEmpty(),
  body('selectedOption', 'Selected option must be a non-empty string').isString().notEmpty(),
  body('nftTokenId', 'NFT token ID must be a non-empty string').isString().notEmpty(),
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
      const { proposalId, selectedOption, nftTokenId } = req.body;
      
      const governanceService = new GovernanceToken();
      const result = await governanceService.castVote(proposalId, selectedOption, nftTokenId);
      
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
  '/voting/Results/:proposalId',
  param('proposalId', 'Proposal ID must be a non-empty string').isString().notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(BAD_REQUEST).json({
        status: getReasonPhrase(BAD_REQUEST),
        reason: 'VALIDATION_ERROR',
        message: 'Invalid path parameter',
        timestamp: new Date().toISOString(),
        errors: errors.array(),
      });
    }

    try {
      const { proposalId } = req.params;
      
      const governanceService = new GovernanceToken();
      const result = await governanceService.getVotingResults(proposalId);
      
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

export { assetsRouter }; 