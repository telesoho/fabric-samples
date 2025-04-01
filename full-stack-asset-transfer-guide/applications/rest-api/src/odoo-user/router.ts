import { Application, Request, Response } from "express";
import { Connection } from "../connection";
import { OdooUser } from "./odoo-user";
import { userRouter } from "./user.router";

export class OdooUserRouter {
    public routes(app: Application): void {
        app.use('/user', userRouter);
        
        app.route('/userInfo')
            .get(async (req: Request, res: Response) => {
                const smartContract = new OdooUser(Connection.odooUserContract);
                const data = await smartContract.accountInfo();
                res.status(200).send(data);
            })
    }
}
