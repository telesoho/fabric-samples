import { NextFunction, Request, Response } from 'express';


export const gatewayMiddleware = async (
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
    console.error(`Error occurred for ${req.method} ${req.url}: ${err}`);
    if (req.app.locals.gateway) {
      console.error(`Closing gateway for ${req.method} ${req.url}`);
      req.app.locals.gateway.close();
    }
  });
  next();
};