import * as grpc from '@grpc/grpc-js';
import { connect, Contract, hash, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import * as path from 'path';
import express from 'express';
import { promises as fs } from 'fs';
import * as config from './config';
import { createWallet } from './fabric-helper/ca_util';
import { buildCAClient, enrollAdmin } from './fabric-helper/ca_util';
import { PostgreSQLManager } from './fabric-helper/postgresql_manager';
import { logger } from './logger';
import { CommonConnectionProfileHelper } from './fabric-helper/ccp';
import FabricCAServices from 'fabric-ca-client';
import { Wallet } from './fabric-helper/wallet/wallet';

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'asset-transfer');
const odooUserChaincodeName = envOrDefault('CHAINCODE_NAME_ODOO_USER', 'odoo-user');

const mspId = envOrDefault('MSP_ID', 'Org1MSP');
//Local development and testing uncomment below code
const WORKSHOP_CRYPTO =envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..','..', '..', 'infrastructure', 'sample-network', 'temp'));
const keyPath = WORKSHOP_CRYPTO + "/enrollments/org1/users/org1admin/msp/keystore/key.pem";
const certPath = WORKSHOP_CRYPTO + "/enrollments/org1/users/org1admin/msp/signcerts/cert.pem"
const tlsCertPath = WORKSHOP_CRYPTO + "/channel-msp/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem";

// //kubenetes certificates file path
// const WORKSHOP_CRYPTO = "/etc/secret-volume/"
// const keyPath = WORKSHOP_CRYPTO + "keyPath";
// const certPath = WORKSHOP_CRYPTO + "certPath"
// const tlsCertPath = WORKSHOP_CRYPTO + "tlsCertPath";
console.log("keyPath " + keyPath);
console.log("certPath " + certPath);
console.log("tlsCertPath " + tlsCertPath);
const peerEndpoint = "test-network-org1-peer1-peer.localho.st:443";
const peerHostAlias = "test-network-org1-peer1-peer.localho.st";
export class Connection {
    public static contract: Contract;
    public static odooUserContract: Contract;
    public static coconikoCoinContract: Contract;
    public static coconikoNFTContract: Contract;
    public static governanceTokenContract: Contract;
    private static _caClient: FabricCAServices;
    private static _ccp: CommonConnectionProfileHelper;
    private static _grpcClient: grpc.Client;

    public static async grpcClient() :Promise<grpc.Client> {
        if (!Connection._grpcClient) {
            // Connection._grpcClient = await newGrpcConnection();
            const tlsCertPath = Connection.ccp().getCertificateAuthority(config.caHostName).tlsCACerts.path;
            const tlsRootCert = await fs.readFile(tlsCertPath);
            const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
            Connection._grpcClient = new grpc.Client(peerEndpoint, tlsCredentials, {
                'grpc.ssl_target_name_override': peerHostAlias,
            });
        }
        return Connection._grpcClient;
    }
    public static caClient() :FabricCAServices {
        if (!Connection._caClient) {
            Connection._caClient = buildCAClient();
        }
        return Connection._caClient;
    }
    public static ccp() :CommonConnectionProfileHelper {
        if (!Connection._ccp) {
            Connection._ccp = new CommonConnectionProfileHelper(config.commonConnectionProfileFile, true);
        }
        return Connection._ccp;
    }
    public async init(app: express.Application) {
        // build an in memory object with the network configuration (also known as a connection profile)

        await initFabric(app);
    }
}

async function initFabric(app: express.Application): Promise<void> {
    logger.info('Connecting to Fabric network with mspid');
    const wallet: Wallet = await createWallet();
  
    app.locals.wallet = wallet;
  
    // build an instance of the fabric ca services client based on
    // the information in the network configuration
    const caClient = Connection.caClient();
  
    // in a real application this would be done on an administrative flow, and only once
    // TODO: need to reenroll
    await enrollAdmin(caClient, wallet, config.orgMSPID);
  
    if(config.postgreSqlUri) {
      const dbManager = await PostgreSQLManager.create(
        config.postgreSqlUri, 
        config.postgreSqlDb!, 
        config.postgreSqlAdminDb);
  
      app.locals.dbManager = dbManager;
    }

    // The gRPC client connection should be shared by all Gateway connections to this endpoint.
    const client = await Connection.grpcClient();

    // Must use an admin to register a new user
    const adminIdentity = await wallet.get(config.admin);
    if (!adminIdentity) {
      console.log(
        'An identity for the admin user does not exist in the wallet'
      );
      console.log('Enroll the admin user before retrying');
      throw new Error(
        'An identity for the admin user does not exist in the wallet'
      );
    }

    // build a user object for authenticating with the CA
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);

    const identity = provider.getGatewayIdentity(adminIdentity);
    const signer = provider.getGatewaySigner(adminIdentity);

    const gateway = connect({
        client,
        identity: identity,
        signer: signer,
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

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network.
        const contract = network.getContract(chaincodeName);
        Connection.contract = contract;
        
        const odooUserContract = network.getContract(odooUserChaincodeName);
        Connection.odooUserContract = odooUserContract;
        
        const coconikoCoinContract = network.getContract(config.coconikoChainCode, config.coconikoCoinContract);
        Connection.coconikoCoinContract = coconikoCoinContract;

        const coconikoNFTContract = network.getContract(config.coconikoChainCode, config.coconikoNFTContract);
        Connection.coconikoNFTContract = coconikoNFTContract;

        const governanceTokenContract = network.getContract(config.coconikoChainCode, config.coconikoGovernanceTokenContract);
        Connection.governanceTokenContract = governanceTokenContract;

        // Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
        //        await initLedger(contract);


    } catch (e: any) {
        console.log('sample log');
        console.log(e.message);
    } finally {
        // console.log('error log ');
        // gateway.close();
        // client.close();
    }
}

/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}
