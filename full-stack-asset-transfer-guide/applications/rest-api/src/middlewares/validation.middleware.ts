import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

const { BAD_REQUEST, UNAUTHORIZED } = StatusCodes;

/**
 * Middleware to validate request body
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
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
  next();
};

/**
 * Middleware to validate authentication context
 */
export const validateAuthContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const { userId, mspId, gateway } = req.app.locals;
  
  if (!userId || !mspId || !gateway) {
    return res.status(UNAUTHORIZED).json({
      status: getReasonPhrase(UNAUTHORIZED),
      reason: 'AUTHENTICATION_REQUIRED',
      message: 'User authentication context is missing or incomplete',
      timestamp: new Date().toISOString(),
    });
  }
  
  next();
};
