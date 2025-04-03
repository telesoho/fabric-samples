import { Contract } from "@hyperledger/fabric-gateway";
import * as config from "../config";
import { Gateway } from "@hyperledger/fabric-gateway";
import { Network } from "@hyperledger/fabric-gateway";
import { Request } from "express";

// Utility function to get contract instance
export const getCoconikoCoinContract = (req: Request): Contract => {
    const gateway: Gateway = req.app.locals.gateway;
    const network: Network = gateway.getNetwork(config.channelName);
    return network.getContract(config.coconikoChainCode, config.coconikoCoinContract);
};
