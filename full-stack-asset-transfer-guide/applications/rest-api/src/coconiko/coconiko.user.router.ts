import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { logger } from '../logger';
import { CoconikoCoin } from './coconiko-coin';
import { registerAndEnrollUser } from '../fabric-helper/ca_util';
import * as config from '../config';
import { Connection } from '../connection';
import { connect, Contract, hash, Network } from '@hyperledger/fabric-gateway';
import { UserExistsError } from '../errors';

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
      
      return res.status(OK).json(result);
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
  body('active', '{Boolean} activation status of the user').isBoolean().toBoolean().notEmpty(),
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
      
      const { active } = req.body;
      const gateway = req.app.locals.gateway;
      const network: Network = gateway.getNetwork(config.channelName);
      const coconikoCoinContract: Contract = network.getContract(config.coconikoChainCode, config.coconikoCoinContract);

      const coinService = new CoconikoCoin(coconikoCoinContract);
      const result = await coinService.ActiveUser(active);
      
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
  });

assetsRouter.get('/user', async (req: Request, res: Response) => {
  try {
    
    const gateway = req.app.locals.gateway;
    const network = gateway.getNetwork(config.channelName);
    const coconikoCoinContract = network.getContract(config.coconikoChainCode, config.coconikoCoinContract);

    const coinService = new CoconikoCoin(coconikoCoinContract);
    const result = await coinService.ClientAccountInfo();

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
});

export { assetsRouter };