import { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ApiKeyFileHelper } from '../utils/apikey';
import * as config from '../config';
import { logger } from '../logger';

/**
 * Gateway middleware for automatically connecting to Fabric network
 * Uses X-API-Key and userId from headers to determine the appropriate MSP ID
 */
export const gatewayMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Get API key and app info
    const apiKey = req.header('X-API-Key');
    const appInfo = req.app.locals.appInfo;
    
    if (!appInfo) {
      logger.error('Missing app info - ensure authenticateApiKey middleware is used before gatewayMiddleware');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: getReasonPhrase(StatusCodes.UNAUTHORIZED),
        reason: 'Missing app info',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get user ID from header
    const userId = req.header('userId');
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: getReasonPhrase(StatusCodes.UNAUTHORIZED),
        reason: 'Missing userId header',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Generate MSP ID based on userId and appId
    let mspId = userId;
    
    // If app doesn't share users, append app_id to make a unique MSP ID
    if (false === appInfo.share_user) {
      mspId = `${userId}.${appInfo.app_id}`;
    }
    
    logger.debug(`Using MSP ID: ${mspId}`);
    
    // Get wallet instance
    // const wallet = await WalletFactory.getWallet();
    
    // // Check if wallet exists for this MSP ID
    // if (!await wallet.exists(mspId)) {
    //   return res.status(StatusCodes.UNAUTHORIZED).json({
    //     status: getReasonPhrase(StatusCodes.UNAUTHORIZED),
    //     reason: `No wallet found for user: ${userId}`,
    //     timestamp: new Date().toISOString(),
    //   });
    // }
    
    // // Get Gateway from wallet
    // const gateway = await wallet.getGateway(mspId);
    
    // // Store Gateway and MSP ID in request
    // req.app.locals.gateway = gateway;
    req.app.locals.mspId = mspId;
    
    // Continue to next middleware
    next();
  } catch (error) {
    logger.error(`Gateway middleware error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
      reason: 'Failed to connect to Fabric network',
      timestamp: new Date().toISOString(),
    });
  }
}; 