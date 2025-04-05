import * as grpc from '@grpc/grpc-js';
import { connect, Contract, hash, Gateway, Network } from '@hyperledger/fabric-gateway';
import * as path from 'path';
import express from 'express';
import { promises as fs, readFileSync } from 'fs';
import * as config from './config';
import { createWallet } from './fabric-helper/ca_util';
import { buildCAClient, enrollAdmin } from './fabric-helper/ca_util';
import { PostgreSQLManager } from './fabric-helper/postgresql_manager';
import { logger } from './logger';
import { CommonConnectionProfileHelper } from './fabric-helper/ccp';
import FabricCAServices from 'fabric-ca-client';
import { Wallet } from './fabric-helper/wallet/wallet';
import { Request } from 'express';

// //kubenetes certificates file path
// const WORKSHOP_CRYPTO = "/etc/secret-volume/"
// const keyPath = WORKSHOP_CRYPTO + "keyPath";
// const certPath = WORKSHOP_CRYPTO + "certPath"
// const tlsCertPath = WORKSHOP_CRYPTO + "tlsCertPath";

export class Connection {
    public static contract: Contract; 
    private static _caClient: FabricCAServices;
    private static _ccp: CommonConnectionProfileHelper;
    private static _grpcPeerClient: grpc.Client;
    private static _wallet: Wallet;
    private static _pgManager: PostgreSQLManager;

    private _app: express.Application;

    constructor(app: express.Application) {
        this._app = app;
    }

    public async destroy() {
        await this.close();
    }

    public async init() {
        await this.initFabric();
    }

    public async close() {
        if(Connection._pgManager) {
            await Connection._pgManager.close();
        }

        if(Connection._grpcPeerClient) {
            Connection._grpcPeerClient.close();
        }
    }

    private async initFabric(): Promise<void> {
        logger.info('Connecting to Fabric network with mspid');
        const wallet = await createWallet();
        Connection._wallet = wallet;
    
        // in a real application this would be done on an administrative flow, and only once
        await enrollAdmin(Connection.caClient, Connection.wallet, config.orgMSPID);
        const identity = await wallet.get(config.admin);
        if (!identity) {
          throw new Error(
            'An identity for the user does not exist in the wallet'
          );
        }
  
        // build a user object for authenticating with the CA
        const provider = wallet
          .getProviderRegistry()
          .getProvider(identity.type);
  
        const gateway = connect({
            client: Connection.client,
            identity: provider.getGatewayIdentity(identity),
            signer: provider.getGatewaySigner(identity),
            hash: hash.sha256,
            // Default timeouts for different gRPC calls
            evaluateOptions: () => {
                return { deadline: Date.now() + 5000 }; // 5 seconds
            },
            endorseOptions: () => {
                return { deadline: Date.now() + 15000 }; // 15 seconds
            },
            submitOptions: () => {
                return { deadline: Date.now() + 5000 }; // 5 seconds
            },
            commitStatusOptions: () => {
                return { deadline: Date.now() + 60000 }; // 1 minute
            },
        });
  
        if(config.postgreSqlUri) {
          const dbManager = await PostgreSQLManager.create(
            config.postgreSqlUri, 
            config.postgreSqlDb!, 
            config.postgreSqlAdminDb,
            gateway);

          Connection._pgManager = dbManager;
        }
    }

    public static get pgManager(): PostgreSQLManager {
        if (!Connection._pgManager) {
            throw new Error('PostgreSQL manager not initialized');
        }
        return Connection._pgManager;
    }

    public static get wallet(): Wallet {
        if (!Connection._wallet) {
            throw new Error('Wallet not initialized');
        }
        return Connection._wallet;
    }

    public static get client(): grpc.Client {
        return Connection.getPeerClient(config.peerName);
    }

    public static getPeerClient(peerName: string) :grpc.Client {
        if (!Connection._grpcPeerClient) {
            const peer = Connection.ccp.getPeer(peerName);
            const tlsCertPath = peer.tlsCACerts.path;
            const tlsRootCert = readFileSync(tlsCertPath);
            const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
            // Connection._grpcPeerClient = new grpc.Client(config.peerEndpoint, tlsCredentials, {
            //     'grpc.ssl_target_name_override': config.peerHostAlias,
            // });
            Connection._grpcPeerClient = new grpc.Client(peer.address, tlsCredentials, peer.clientOptions);
        }
        return Connection._grpcPeerClient;
    }

    public static get caClient() :FabricCAServices {
        if (!Connection._caClient) {
            Connection._caClient = buildCAClient(config.caName);
        }
        return Connection._caClient;
    }

    public static get ccp() :CommonConnectionProfileHelper {
        if (!Connection._ccp) {
            Connection._ccp = new CommonConnectionProfileHelper(config.commonConnectionProfileFile, true);
        }
        return Connection._ccp;
    }
}


// Utility function to get contract instance
export const getCoconikoCoinContract = (req: Request): Contract | undefined => {
    const gateway: Gateway = req.app.locals.gateway;
    if (!gateway) {
        return undefined;
    }
    const network: Network = gateway.getNetwork(config.channelName);
    return network.getContract(config.coconikoChainCode, config.coconikoCoinContract);
};

export const getOdooUserContract = (req: Request): Contract | undefined => {
    const gateway: Gateway = req.app.locals.gateway;
    if (!gateway) {
        return undefined;
    }
    const network: Network = gateway.getNetwork(config.channelName);
    return network.getContract(config.odooUserChainCode);
};

export const getNFTContract = (req: Request): Contract | undefined => {
    const gateway: Gateway = req.app.locals.gateway;
    if (!gateway) {
        return undefined;
    }
    const network: Network = gateway.getNetwork(config.channelName);
    return network.getContract(config.coconikoChainCode, config.coconikoNFTContract);
};

export const getGovernanceTokenContract = (req: Request): Contract | undefined => {
    const gateway: Gateway = req.app.locals.gateway;
    if (!gateway) {
        return undefined;
    }
    const network: Network = gateway.getNetwork(config.channelName);
    return network.getContract(config.coconikoChainCode,config.coconikoGovernanceTokenContract);
};
