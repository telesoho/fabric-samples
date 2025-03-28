import { Application } from "express";
import { authenticateApiKey } from '../middlewares/auth.middleware';
import { assetsRouter as coconikoCoinRouter } from './coconiko.coin.router';
import { assetsRouter as coconikoUserRouter} from './coconiko.user.router';
import { assetsRouter as coconikoDebugRouter} from './coconiko.debug.router';
import { assetsRouter as coconikoNFTRouter} from './coconiko.nft.router';
import { assetsRouter as coconikoGovernanceRouter } from './coconiko.governance.router';
import path from "path";


export class CoconikoRouter {
    public routes(app: Application): void {
        if (process.env.NODE_ENV === 'development') {
            const swaggerUi = require('swagger-ui-express');
            const swaggerJsonPath = path.resolve(__dirname, '..', 'coconiko_swagger.json');
            const coconikoSwaggerDocument = require(swaggerJsonPath);
            const options = {
                customSiteTitle: 'SDL Fabric Network REST API Server',
            };
            app.use('/api-docs', swaggerUi.serveFiles(coconikoSwaggerDocument, options), swaggerUi.setup(coconikoSwaggerDocument));
        }
        
        app.use('/api/coconiko', authenticateApiKey, coconikoUserRouter);
        app.use('/api/coconiko', authenticateApiKey, coconikoCoinRouter);
        app.use('/api/coconiko', authenticateApiKey, coconikoNFTRouter);
        app.use('/api/coconiko', authenticateApiKey, coconikoGovernanceRouter);
        app.use('/api/coconiko', authenticateApiKey, coconikoDebugRouter);              
    }
}
