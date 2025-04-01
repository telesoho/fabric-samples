import FabricCAServices from 'fabric-ca-client';
import { Wallet } from './wallet/wallet';
import { Identity } from './wallet/identity';
import { UserExistsError } from '../errors';
import * as config from '../config';
import {
  CommonConnectionProfileHelper,
  getPEM,
} from './ccp';
import path from 'path';
import { Wallets } from './wallet/wallets';
import { logger } from '../logger';

/**
 *
 * @param {*} ccp
 */
const buildCAClient = (): FabricCAServices => {
  // build an in memory object with the network configuration (also known as a connection profile)
  const ccp: CommonConnectionProfileHelper =
    new CommonConnectionProfileHelper(config.commonConnectionProfileFile, true);

  // Create a new CA client for interacting with the CA.
  const caInfo = ccp.getCertificateAuthority(config.caHostName);
  const caTLSCACerts = getPEM(caInfo.tlsCACerts);
  const caClient = new FabricCAServices(
    caInfo.url,
    { trustedRoots: [caTLSCACerts], verify: false },
    caInfo.caName
  );

  console.log(`Built a CA Client named ${caInfo.caName}`);
  return caClient;
};

const enrollUser = async (
  caClient: FabricCAServices,
  wallet: Wallet,
  orgMspId: string,
  userId: string,
  secret: string
): Promise<void> => {
  try {
    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get(userId);
    if (identity) {
      console.log('An identity for the user already exists in the wallet');
      return;
    }

    // Enroll the user, and import the new identity into the wallet.
    const enrollUser = {
      enrollmentID: userId,
      enrollmentSecret: secret,
    };
    console.log(enrollUser);
    const enrollment = await caClient.enroll(enrollUser);
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);

    console.log('Successfully enrolled user and imported it into the wallet');
  } catch (error) {
    console.error(`Failed to enroll user : ${error}`);
    throw error;
  }
};

const enrollAdmin = async (
  caClient: FabricCAServices,
  wallet: Wallet,
  orgMspId: string
): Promise<void> => {
  try {
    // Check to see if we've already enrolled the admin user.
    const userKey = config.admin;
    const identity = await wallet.get(config.admin);
    if (identity) {
      console.log(
        'An identity for the admin user already exists in the wallet'
      );
      return;
    }

    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await caClient.enroll({
      enrollmentID: config.admin,
      enrollmentSecret: config.adminPassword,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userKey, x509Identity);

    // Use config.admin's credentials as MSPID's credentials
    // the profile will contain public information about organizations other than the one it belongs to.
    // These are necessary information to make transaction lifecycles work, including MSP IDs and
    // peers with a public URL to send transaction proposals. The file will not contain private
    // information reserved for members of the organization, such as admin key and certificate,
    // fabric-ca registrar enroll ID and secret, etc.
    const mspId = await wallet.get(orgMspId);
    if (!mspId) {
      await wallet.put(orgMspId, x509Identity);
    }

    console.log(
      'Successfully enrolled admin user and imported it into the wallet'
    );
  } catch (error) {
    console.error(`Failed to enroll admin user : ${error}`);
    throw error;
  }
};

const registerAndEnrollUser = async (
  caClient: FabricCAServices,
  wallet: Wallet,
  orgMspId: string,
  userId: string,
  affiliation: string,
  role: string
): Promise<Identity | undefined> => {
  try {
    // Check to see if we've already enrolled the user
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.warn(
        `An identity for the user ${userId} already exists in the wallet`
      );
      throw new UserExistsError(
        `An identity for the user ${userId} already exists in the wallet`
      );
    }

    

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
    const adminUser = await provider.getUserContext(
      adminIdentity,
      config.admin
    );

    // Register the user, enroll the user, and import the new identity into the wallet.
    // if affiliation is specified by client, the affiliation value must be configured in CA
    const secret = await caClient.register(
      {
        affiliation,
        enrollmentID: userId,
        enrollmentSecret: userId + 'pw',
        role: 'client',
        attrs: [
          { name: 'username', value: userId, ecert: true },
          { name: 'role', value: role, ecert: true },
        ],
      },
      adminUser
    );
    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
      attr_reqs: [
        { name: 'role', optional: false },
        { name: 'username', optional: false },
      ],
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    await wallet.put(userId, x509Identity);
    console.log(
      `Successfully registered and enrolled user ${userId} and imported it into the wallet`
    );
    return x509Identity;
  } catch (error) {
    console.error(`Failed to register user : ${error}`);
    throw error;
  }
};


const buildWallet = async (walletPath: string): Promise<Wallet> => {
  // Create a new  wallet : Note that wallet is for managing identities.
  let wallet: Wallet;
  if(config.postgreSqlUri) {
    wallet = await Wallets.newPostgreSQLWallet(config.postgreSqlUri, config.postgreSqlDb, config.postgreSqlAdminDb);
    logger.info(`Built a PostgreSQL wallet at ${config.postgreSqlUri}`);
  } else if (walletPath) {
    wallet = await Wallets.newFileSystemWallet(walletPath);
    logger.info(`Built a file system wallet at ${walletPath}`);
  } else {
    wallet = await Wallets.newInMemoryWallet();
    logger.info('Built an in memory wallet');
  }
  return wallet;
};

/**
 * Creates an in memory wallet to hold credentials for an Org1 and Org2 user
 *
 * In this sample there is a single user for each MSP ID to demonstrate how
 * a client app might submit transactions for different users
 *
 * Alternatively a REST server could use its own identity for all transactions,
 * or it could use credentials supplied in the REST requests
 */
export const createWallet = async (): Promise<Wallet> => {
  const walletPath = path.resolve(process.cwd(), 'wallet-data');
  const wallet = await buildWallet(walletPath);

  return wallet;
};

export { buildCAClient, enrollAdmin, registerAndEnrollUser, enrollUser };
