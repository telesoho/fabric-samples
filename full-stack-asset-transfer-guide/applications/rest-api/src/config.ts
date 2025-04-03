import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import { from, logger } from 'env-var';

// const parsed = dotenv.parse(fs.readFileSync('.env', { encoding: 'utf8'}))
const env = from(process.env, {}, logger);

/**
 * Log level for the REST server
 */
export const logLevel = env
  .get('LOG_LEVEL')
  .default('info')
  .asEnum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

/**
 * The port to start the REST server on
 */
export const port = env
  .get('PORT')
  .default('3000')
  .example('3000')
  .asPortNumber();

/**
 * Whether to convert discovered host addresses to be 'localhost'
 * This should be set to 'true' when running a docker composed fabric network on the
 * local system, e.g. using the test network; otherwise should it should be 'false'
 */
// export const asLocalhost = env
//   .get('AS_LOCAL_HOST')
//   .default('true')
//   .example('true')
//   .asBoolStrict();

/**
 * The Org1 MSP ID
 */
export const orgMSPID = env
  .get('ORG_MSP_ID')
  .default(`Org1MSP`)
  .example(`Org1MSP`)
  .asString();

/**
 * Name of the channel which the basic asset sample chaincode has been installed on
 */
export const channelName = env
  .get('CHANNEL_NAME')
  .default('mychannel')
  .example('mychannel')
  .asString();

// /**
//  * Name used to install the basic asset sample
//  */
// export const chaincodeName = env
//   .get('CHAINCODE_NAME')
//   .default('erc721')
//   .example('erc721')
//   .asString();

// /**
//  * The transaction submit timeout in seconds for commit notification to complete
//  */
// export const commitTimeout = env
//   .get('HLF_COMMIT_TIMEOUT')
//   .default('300')
//   .example('300')
//   .asIntPositive();

// /**
//  * The transaction submit timeout in seconds for the endorsement to complete
//  */
// export const endorseTimeout = env
//   .get('HLF_ENDORSE_TIMEOUT')
//   .default('30')
//   .example('30')
//   .asIntPositive();

// /**
//  * The transaction query timeout in seconds
//  */
// export const queryTimeout = env
//   .get('HLF_QUERY_TIMEOUT')
//   .default('3')
//   .example('3')
//   .asIntPositive();

/**
 * The Org1 connection profile JSON
 * see: https://hyperledger.github.io/fabric-sdk-node/release-2.2/tutorial-commonconnectionprofile.html
 */
export const commonConnectionProfileFile = env
  .get('COMMON_CONNECTION_PROFILE_FILE')
  .default('test-network-ccp.json')
  .required()
  .asString();

/**
 * API key for Org Sdl
 * Specify this API key with the X-Api-Key header to use the Org1 connection profile and credentials
 */
export const apiKeyFile = env
  .get('APIKEY_FILE')
  .required()
  .asString();

/**
 * API key for Org Sdl
 * Specify this API key with the X-Api-Key header to use the Org1 connection profile and credentials
 */
export const caHostName = env
  .get('CA_HOST_NAME')
  .required()
  .example('org1-ca')
  .asString();

export const admin = env
  .get('ADMIN')
  .required()
  .example('rcaadmin')
  .asString();

export const adminPassword = env
  .get('ADMIN_PASSWORD')
  .required()
  .example('rcaadminpw')
  .asString();

export const odooUserChainCode = env
  .get('ODOO_USER_CHAINCODE')
  .default('odoo-user')
  .example('odoo-user')
  .asString();

export const coconikoChainCode = env
  .get('COCONIKO_CHAINCODE')
  .default('coconiko')
  .example('coconiko')
  .asString();

export const coconikoCoinContract = env
  .get('COCONIKO_COIN_CONTRACT')
  .default('CoconikoCoinContract')
  .example('CoconikoCoinContract')
  .asString();

export const coconikoNFTContract = env
  .get('COCONIKO_NFT_CONTRACT')
  .default('CoconikoNFTContract')
  .example('CoconikoNFTContract')
  .asString();

export const coconikoGovernanceTokenContract = env
  .get('COCONIKO_GOVERNANCE_TOKEN_CONTRACT')
  .default('GovernanceTokenContract')
  .example('GovernanceTokenContract')
  .asString();

export const coconikoDB = env
  .get('COCONIKO_DB')
  .default('sdlchannel_coconiko-coin')
  .example('sdlchannel_coconiko-coin')
  .asString();

export const postgreSqlUri = env.get('POSTGRES_SQL_URI')
  .example('postgresql://admin:adminpw@postgres.localcoin.jp:5432')
  .asString();

export const postgreSqlAdminDb = env.get('POSTGRES_SQL_ADMIN_DB')
  .example('postgres')
  .asString();

/**
 * The database to use for the REST API
 */
export const postgreSqlDb = env.get('POSTGRES_SQL_DB')
  .example('ambs_fabric_api_db')
  .asString();

/**
 * Rate limit window size in milliseconds, default 60 seconds
 */
export const rateLimitWindowMs = env
  .get('RATE_LIMIT_WINDOW_MS')
  .default('60000')
  .example('60000')
  .asIntPositive();

/**
 * Rate limit max requests per window, default 5
 */
export const rateLimitMax = env
  .get('RATE_LIMIT_MAX')
  .default('5')
  .example('5')
  .asIntPositive();

/**
 * The type of wallet to use
 */
export const walletType = env
  .get('WALLET_TYPE')
  .default('file')
  .asEnum(['file', 'database', 'memory'])  

/**
 * The path to the wallet
 * Only used for file system wallet
 */
export const walletPath = env
  .get('WALLET_PATH')
  .default('./wallet-data')
  .example('./wallet-data')
  .asString();

/**
 * The peer endpoint for the Fabric network
 */
export const peerEndpoint = env
  .get('PEER_ENDPOINT')
  .default('test-network-org1-peer1-peer.localho.st:443')
  .example('test-network-org1-peer1-peer.localho.st:443')
  .asString();

/**
 * The peer host alias for the Fabric network
 */
export const peerHostAlias = env
  .get('PEER_HOST_ALIAS')
  .default('test-network-org1-peer1-peer.localho.st')
  .example('test-network-org1-peer1-peer.localho.st')
  .asString();

export const workshopPath = env
  .get('WORKSHOP_PATH')
  .default('/home/ubuntu/fabric-samples/full-stack-asset-transfer-guide')
  .example('/home/ubuntu/fabric-samples/full-stack-asset-transfer-guide')
  .asString();


/**
 * Path to the fabric-ca-client executable
 * based on the workspace path
 */
export const fabricCAClientPath = env
  .get('FABRIC_CA_CLIENT_PATH')
  .default(`${workshopPath}/bin/fabric-ca-client`)
  .example(`${workshopPath}/bin/fabric-ca-client`)
  .asString();

export const workshopCryptoPath = env
  .get('WORKSHOP_CRYPTO_PATH')
  .default(`${workshopPath}/infrastructure/sample-network/temp`)
  .example(`${workshopPath}/infrastructure/sample-network/temp`)
  .asString();

/**
 * CA TLS configuration
 */
export const caTlsEnabled = env
  .get('CA_TLS_ENABLED')
  .default('true')
  .example('true')
  .asBool();

/**
 * CA TLS certificate path
 */
export const caTlsCertPath = env
  .get('CA_TLS_CERT_PATH')
  .default(`${workshopCryptoPath}/cas/org1-ca/tls-cert.pem`)
  .example(`${workshopCryptoPath}/cas/org1-ca/tls-cert.pem`)
  .asString();

/**
 * Path to the TLS certificate
 */
export const tlsCertPath = env
  .get('TLS_CERT_PATH')
  .default(`${workshopCryptoPath}/channel-msp/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem`)
  .example(`${workshopCryptoPath}/channel-msp/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem`)
  .asString();
