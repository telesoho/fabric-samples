import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
// import { WalletFactory } from '../fabric-helper/wallet-ai/wallet-factory';

/**
 * Controller for user-related operations
 */
export class UserController {
  /**
   * Create a new user and wallet
   * Requires X-API-Key header for application identification
   */
  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, ...userData } = req.body;
      const appInfo = req.app.locals.appInfo;
      
      // Validate required fields
      if (!userId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Missing required field: userId'
        });
        return;
      }
      
      if (!appInfo) {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'App information not available'
        });
        return;
      }
      
      // Generate MSP ID based on userId and appId
      let mspId = userId;
      
      // If app doesn't share users, append app_id to make a unique MSP ID
      if (false === appInfo.share_user) {
        mspId = `${userId}.${appInfo.app_id}`;
      }
      
      logger.info(`Creating user ${userId} with MSP ID ${mspId}`);
      
      // Get wallet instance and create wallet for user
      // const wallet = await WalletFactory.getWallet();
      // const walletData = await wallet.createWallet(userId, mspId);

      // TODO: 
      // 1. register user to fabric network
      // 2. enroll user to fabric network
            
      // Respond with success
      res.status(StatusCodes.CREATED).json({
        userId,
        mspId,
        // createdAt: walletData.createdAt,
        appId: appInfo.app_id,
        message: 'User created successfully'
      });
    } catch (error) {
      logger.error(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  /**
   * Get user details
   * Requires authenticated user with valid wallet
   */
  public getUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId;
      const mspId = req.app.locals.mspId;
      
      // Validate access - user can only access their own data
      if (mspId.startsWith(userId) || req.app.locals.appInfo.admin_as_default) {
        res.status(StatusCodes.OK).json({
          userId,
          mspId,
          appId: req.app.locals.appInfo.app_id
        });
      } else {
        res.status(StatusCodes.FORBIDDEN).json({
          error: 'Access denied'
        });
      }
    } catch (error) {
      logger.error(`Error getting user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: `Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
} 