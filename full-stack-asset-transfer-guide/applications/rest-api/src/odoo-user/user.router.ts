import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateApiKey } from '../middlewares/auth.middleware';
import { gatewayMiddleware } from '../middlewares/gateway-middleware';

/**
 * Router for user-related endpoints
 */
const userRouter = Router();
const userController = new UserController();

/**
 * Create a new user
 * PUT /user
 * Requires X-API-Key header
 */
userRouter.put('/', authenticateApiKey, userController.createUser);

/**
 * Get user details
 * GET /user/:userId
 * Requires X-API-Key header and valid wallet access
 */
userRouter.get('/:userId', authenticateApiKey, gatewayMiddleware, userController.getUser);

export { userRouter }; 