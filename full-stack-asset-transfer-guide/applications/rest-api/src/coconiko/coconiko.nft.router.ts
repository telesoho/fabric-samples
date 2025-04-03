import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import {  StatusCodes } from 'http-status-codes';
import { CoconikoNFT } from './nft';
import { getNFTContract } from '../connection';
import { handleError } from '../errors';
import { validateRequest } from '../middlewares/validation.middleware';

const { OK } = StatusCodes;
const assetsRouter = express.Router();

/**
 * Route to mint a new NFT
 */
assetsRouter.post(
  '/nft/Mint',
  [
    body().isObject().withMessage('body must be an object'),
    body('metadata', 'NFT metadata object').isObject().notEmpty(),
    body('metadata.name', 'NFT name must be a string').isString().notEmpty(),
    body('metadata.price', 'NFT price must be a number').isNumeric().optional(),
    body('metadata.description', 'NFT description must be a string').optional().isString(),
    body('metadata.image', 'Invalid image URL format').isURL(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { metadata } = req.body;
      const nftService = new CoconikoNFT(getNFTContract(req));
      const result = await nftService.mintNFT(metadata);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

/**
 * Route to transfer an NFT to another user
 */
assetsRouter.post(
  '/nft/Transfer',
  [
    body().isObject().withMessage('Request body must be an object'),
    body('tokenId', 'NFT token ID must be a non-empty string').isString().notEmpty(),
    body('from', 'Sender account ID must be a valid string').isString().optional(),
    body('to', 'Recipient account ID must be a valid string').isString().notEmpty(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { tokenId, from, to } = req.body;
      const nftService = new CoconikoNFT(getNFTContract(req));
      const result = await nftService.transferNFT(tokenId, to, from);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

/**
 * Route to get NFT information by token ID
 */
assetsRouter.get(
  '/nft/:tokenId',
  [
    param('tokenId', 'NFT token ID must be a valid string').isString().notEmpty(),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { tokenId } = req.params;
      const nftService = new CoconikoNFT(getNFTContract(req));
      const result = await nftService.getNFTInfo(tokenId);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

/**
 * Route to get all NFTs owned by the requesting user
 */
assetsRouter.get(
  '/nft/my/NFTs',
  async (req: Request, res: Response) => {
    try {
      const nftService = new CoconikoNFT(getNFTContract(req));
      const result = await nftService.getUserNFTs(req.app.locals.userId);

      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  }
);

export { assetsRouter };