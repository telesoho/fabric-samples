import express, { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoCoin } from './coconiko-coin';
import { registerAndEnrollUser } from '../fabric-helper/ca_util';
import * as config from '../config';
import { Connection, getCoconikoCoinContract } from '../connection';
import { connect, hash } from '@hyperledger/fabric-gateway';
import { UserExistsError } from '../errors';
import { validateAuthContext, validateRequest } from '../middlewares/validation.middleware';
import { handleError } from '../errors';


const { CREATED, OK } = StatusCodes;
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
  validateRequest,
  async (req: Request, res: Response) => {
    logger.debug('Register and enroll user to fabric network');
    try {
      const { username, role } = req.body;
      let userName = username;
      if (false === req.app.locals.appInfo.share_user) {
        userName = `${username}.${req.app.locals.appInfo.app_id}`;
      }

      const newIdentity = await registerAndEnrollUser(
          Connection.caClient,
          Connection.wallet,
          config.orgMSPID,
          userName,
          '',
          role
      );

      const provider = Connection.wallet
        .getProviderRegistry()
        .getProvider(newIdentity!.type);

      const identity = provider.getGatewayIdentity(newIdentity);
      const signer = provider.getGatewaySigner(newIdentity);

      const gateway = connect({
          client: Connection.client,
          identity: identity,
          signer: signer,
          hash: hash.sha256,
          // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
      });

      const network = gateway.getNetwork(config.channelName);
      const coconikoCoinContract = network.getContract(config.coconikoChainCode, config.coconikoCoinContract);

      const coinService = new CoconikoCoin(coconikoCoinContract);
      const result = await coinService.CreateUserAccount();
      gateway.close();

      return res.status(OK).json({
        user_name: username,
        app_id: req.app.locals.appInfo.app_id,
        account: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, 'Error processing create user');
      if (err instanceof UserExistsError) {
        return res.status(CREATED).json({
          status: getReasonPhrase(CREATED),
          reason: 'USER_EXISTS',
          message: 'User already exists',
          timestamp: new Date().toISOString(),
        });
      }
      return handleError(err, req, res);
    }
  }
);

assetsRouter.post('/user',
  body().isObject().withMessage('body must be an object'),
  body('active', '{Boolean} activation status of the user').isBoolean().toBoolean().notEmpty(),
  validateRequest,
  validateAuthContext,
  async (req: Request, res: Response) => {
    try {
      logger.debug(req.body);
      
      const { active } = req.body;

      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.ActiveUser(active);
      
      return res.status(OK).json({ result });
    } catch (err) {
      return handleError(err, req, res);
    }
  });

assetsRouter.get('/user',
  validateAuthContext,
  async (req: Request, res: Response) => {
    try {
      const coinService = new CoconikoCoin(getCoconikoCoinContract(req));
      const result = await coinService.ClientAccountInfo();

    return res.status(OK).json({ result });
  } catch (err) {
    return handleError(err, req, res);
  }
});

export { assetsRouter };