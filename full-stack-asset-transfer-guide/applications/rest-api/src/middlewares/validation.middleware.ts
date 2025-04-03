import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

const { BAD_REQUEST } = StatusCodes;

// Middleware to validate request body
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
