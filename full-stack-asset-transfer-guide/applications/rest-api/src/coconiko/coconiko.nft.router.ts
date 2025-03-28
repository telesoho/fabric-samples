import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoNFT } from './nft';

const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR, OK, NOT_FOUND } = StatusCodes;
const assetsRouter = express.Router();

assetsRouter.post(
  '/nft/Mint',
  body().isObject().withMessage('body must be an object'),
  body('metadata', 'NFT metadata object').isObject().notEmpty(),
  body('metadata.name', 'NFT name must be a string').isString().notEmpty(),
  body('metadata.price', 'NFT price must be a number').isNumeric().optional(),
  body('metadata.description', 'NFT description must be a string').optional().isString(),
  body('metadata.image', 'Invalid image URL format').isURL(),
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
      const { metadata } = req.body;
      
      const nftService = new CoconikoNFT();
      const result = await nftService.mintNFT(userId, metadata);
      
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
  '/nft/Transfer',
  body().isObject().withMessage('Request body must be an object'),
  body('tokenId', 'NFT token ID must be a non-empty string').isString().notEmpty(),
  body('from', 'Sender account ID must be a valid string').isString().optional(),
  body('to', 'Recipient account ID must be a valid string').isString().notEmpty(),
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
      const { tokenId, from, to } = req.body;
      
      const nftService = new CoconikoNFT();
      const result = await nftService.transferNFT(userId, tokenId, to, from);
      
      return res.status(OK).json({ result });
    } catch (err) {
      logger.error({ err }, req.url);
      if (req.app.get('env') === 'development') {
        const message = err instanceof Error ? err.message : err;
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
  '/nft/:tokenId',
  param('tokenId', 'NFT token ID must be a valid string').isString().notEmpty(),
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
      const { tokenId } = req.params;
      
      const nftService = new CoconikoNFT();
      const result = await nftService.getNFTInfo(tokenId);
      
      return res.status(OK).json({ result });
    } catch (err) {
      logger.error({ err }, req.url);
      if (req.app.get('env') === 'development') {
        const message = err instanceof Error ? err.message : err;
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
  '/nft/my/NFTs',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user as string;
      
      const nftService = new CoconikoNFT();
      const result = await nftService.getUserNFTs(userId);
      
      return res.status(OK).json({ result });
    } catch (err) {
      logger.error({ err }, req.url);
      if (req.app.get('env') === 'development') {
        const message = err instanceof Error ? err.message : err;
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