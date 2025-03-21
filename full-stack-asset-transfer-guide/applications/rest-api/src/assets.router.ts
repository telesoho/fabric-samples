import { Application, Request, Response } from "express";
import { Connection } from "./connection";
import { AssetTransfer } from "./contract";
import { logger } from './logger';

export class AssetRouter {
    public routes(app: Application): void {
        app.route('/list')
            .get(async (req: Request, res: Response) => {
                const smartContract = new AssetTransfer(Connection.contract);
                const data = await smartContract.getAllAssets();
                res.status(200).send(data);
            })
        app.route('/create')
            .post(async (req: Request, res: Response) => {
                logger.debug(req.body)
                const smartContract = new AssetTransfer(Connection.contract);
                var Id = Date.now();                
                await smartContract.createAsset({
                    ID: Id + "",
                    Owner: req.body.Owner,
                    Color: req.body.Color,
                    Size: req.body.Size,
                    AppraisedValue: req.body.AppraisedValue,
                });
                var response = ({ Id })
                res.status(200).send(response);
            })
        app.route('/update')
            .post(async (req: Request, res: Response) => {
                logger.debug(req.body)
                try {
                    const smartContract = new AssetTransfer(Connection.contract);
                    const result = await smartContract.updateAsset({
                        ID: req.body.ID,
                        Color: req.body.Color,
                        Size: req.body.Size,
                        AppraisedValue: req.body.AppraisedValue,
                    })
                    res.status(200).send(result);
                } catch (error) {
                    logger.error("error", error);
                    res.status(500).send({error});
                }
            })
        app.route('/delete')
            .post(async (req: Request, res: Response) => {
                logger.debug(req.body)
                var response;
                try {
                    const smartContract = new AssetTransfer(Connection.contract);
                    const result = await smartContract.deleteAsset(req.body.id);
                    res.status(200).send(result);
                } catch (error) {
                    logger.error("error", error);
                    res.status(500).send({error});
                }
                res.status(200).send(response);
            })
        app.route('/get/:id')
            .get(async (req: Request, res: Response) => {
                let id = req.params.id;
                const smartContract = new AssetTransfer(Connection.contract);
                const ret = await smartContract.readAsset(id);

                res.status(200).send(ret);
            })
    }

}
