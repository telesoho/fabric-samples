import express from 'express';
import bodyParser from 'body-parser';
import { Connection } from './connection';
import { AssetRouter } from './asset-transfer/router';
import { OdooUserRouter } from './odoo-user/router';
import { CoconikoRouter } from './coconiko/router';
import { healthRouter } from './health.router';
import passport from './middlewares/auth.middleware';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as config from './config';

class App {
    public app: express.Application;
    public assertRoutes: AssetRouter = new AssetRouter();
    public odooUserRoutes: OdooUserRouter = new OdooUserRouter();
    public coconikoRoutes: CoconikoRouter = new CoconikoRouter();
    constructor() {
        new Connection().init();
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(passport.initialize());
        if (process.env.NODE_ENV === 'development') {
            var cors = require('cors');
            this.app.use(cors());
        } else if (process.env.NODE_ENV === 'production') {
            this.app.use(helmet());
        }
        this.app.use(
            rateLimit({
                windowMs: config.rateLimitWindowMs,
                limit: config.rateLimitMax,
                standardHeaders: true,
                legacyHeaders: false,
            })
        );
        // this.config();
        this.assertRoutes.routes(this.app);
        this.odooUserRoutes.routes(this.app);
        this.coconikoRoutes.routes(this.app);
        this.app.use('/', healthRouter);
    }

    private config(): void {
        // support application/json type post data
        this.app.use(bodyParser.json());
        //support application/x-www-form-urlencoded post data
        this.app.use(bodyParser.urlencoded({
            extended: false
        }));
    }
}
export default new App().app;
