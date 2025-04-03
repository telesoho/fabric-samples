import { Application, Request, Response } from "express";
import { getOdooUserContract } from "../connection";
import { OdooUser } from "./odoo-user";

export class OdooUserRouter {
    public routes(app: Application): void {        
        app.route('/userInfo')
            .get(async (req: Request, res: Response) => {
                const smartContract = new OdooUser(getOdooUserContract(req));
                const data = await smartContract.accountInfo();
                res.status(200).send(data);
            })
    }
}
