import { logger } from '../logger';
import passport from 'passport';
import { NextFunction, Request, Response } from 'express';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import * as config from '../config';

import {
  Strategy as JWTStrategy,
  ExtractJwt,
  StrategyOptions,
} from 'passport-jwt';
import { ApiKeyFileHelper } from '../utils/apikey';
import { Connection } from '../connection';
import { hash, connect } from '@hyperledger/fabric-gateway';

const { UNAUTHORIZED } = StatusCodes;

const fabricAPIKeyStrategy: HeaderAPIKeyStrategy = new HeaderAPIKeyStrategy(
  { header: 'X-API-Key', prefix: '' },
  true,
  async function (apikey, done, req) {
    logger.debug({ apikey }, 'Checking X-API-Key');

    try {

      const appkeys: ApiKeyFileHelper = new ApiKeyFileHelper(
        config.apiKeyFile
      );

      const theApp = appkeys.getAppInfo(apikey);
      if (theApp == undefined) {
        throw 'No valid X-API-Key';
      }

      if(req) {
        req.app.locals.appInfo = theApp;
      }

      // mspId is alaias of userId for compatibility
      let mspId = req?.header('mspId') as string;
      let userId = req?.header('userId') as string;
 
      mspId = mspId ? mspId : userId;
 
      if (mspId === undefined) {
        if (theApp.admin_as_default) {
          mspId = config.admin;
        }
        else {
          return done(null, `${theApp.app_id} with no mspId`);
        }
      } else {
        if (false === theApp.share_user) {
          mspId = `${mspId}.${theApp.app_id}`;
        }
      }

      const identity = await Connection.wallet.get(mspId);
      if (!identity) {
        return done(null, false, 'An identity for the user does not exist');        
      }

      // build a user object for authenticating with the CA
      const provider = Connection.wallet
        .getProviderRegistry()
        .getProvider(identity.type);

      const gateway = connect({
          client: Connection.client,
          identity: provider.getGatewayIdentity(identity),
          signer: provider.getGatewaySigner(identity),
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

      if(req) {
        req.app.locals.gateway = gateway;
      }

      return done(null, mspId);
    } catch (e) {
      if (typeof e === 'string') {
        logger.error(e);
        return done(null, false, e);
      } else if (e instanceof Error) {
        logger.error(e.message);
        return done(null, false, e.message);
      }
    }
  }
);

passport.use(fabricAPIKeyStrategy);

export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate(
    'headerapikey',
    { session: false },
    (err: any, user: Express.User, _info: any) => {
      if (err) return next(err);
      if (!user)
        return res.status(UNAUTHORIZED).json({
          status: getReasonPhrase(UNAUTHORIZED),
          reason: _info,
          timestamp: new Date().toISOString(),
        });

      req.logIn(user, { session: false }, async (err) => {
        if (err) {
          return next(err);
        }
        return next();
      });
    }
  )(req, res, next);
};

// 2 passport-jwtの設定
const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
};

passport.use(
  new JWTStrategy(opts, (jwt_payload: any, done: any) => {
    done(null, jwt_payload);
  })
);

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate('jwt', { session: false }, (err: any, user: Express.User, _info: any) => {
    if (err) return next(err);
    if (!user)
      return res.status(UNAUTHORIZED).json({
        status: getReasonPhrase(UNAUTHORIZED),
        reason: 'NO_VALID_JWT',
        timestamp: new Date().toISOString(),
      });

    req.logIn(user, { session: false }, async (err) => {
      if (err) {
        return next(err);
      }
      return next();
    });
  })(req, res, next);
};

export const gatewayCloseMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  res.on('finish', () => {
    console.debug(`Response finished for ${req.method} ${req.url} with status ${res.statusCode}`);
    if (req.app.locals.gateway) {
      console.debug(`Closing gateway for ${req.method} ${req.url}`);
      req.app.locals.gateway.close();
    }
  });
  res.on('error', (err) => {
    console.debug(`Error occurred for ${req.method} ${req.url}: ${err}`);
    if (req.app.locals.gateway) {
      console.debug(`Closing gateway for ${req.method} ${req.url}`);
      req.app.locals.gateway.close();
    }
  });  
  next();
};

// 3 passportをexport
export default passport;
