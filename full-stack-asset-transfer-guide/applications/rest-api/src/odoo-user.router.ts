import { Application, Request, Response } from "express";
import { Connection } from "./connection";
import { OdooUser } from "./contract-odoo-user";

export class OdooUserRouter {
    public routes(app: Application): void {
        app.route('/user')
            .get(async (req: Request, res: Response) => {
                const smartContract = new OdooUser(Connection.odooUserContract);
                const data = await smartContract.accountInfo();
                res.status(200).send(data);
            })
    }
}
