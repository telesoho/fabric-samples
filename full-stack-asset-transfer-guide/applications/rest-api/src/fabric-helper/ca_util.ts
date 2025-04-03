import FabricCAServices from 'fabric-ca-client';
import { Wallet } from './wallet/wallet';
import { Identity } from './wallet/identity';
import { UserExistsError } from '../errors';
import * as config from '../config';
import {
  getPEM,
} from './ccp';
import { Wallets } from './wallet/wallets';
import { logger } from '../logger';
import { Connection } from '../connection';
/**
 *
 * @param {*} ccp
 */
const buildCAClient = (): FabricCAServices => {

  // Create a new CA client for interacting with the CA.
  const caInfo = Connection.ccp.getCertificateAuthority(config.caHostName);
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
): Promise<Identity> => {
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


export const createWallet = async (): Promise<Wallet> => {
  // Create a new  wallet : Note that wallet is for managing identities.
  let wallet: Wallet;
  switch(config.walletType) {
    case 'database':
      wallet = await Wallets.newPostgreSQLWallet(config.postgreSqlUri!, config.postgreSqlDb!, config.postgreSqlAdminDb!);
      logger.info(`Built a PostgreSQL wallet at ${config.postgreSqlUri}`);
      break;
    case 'file':
      wallet = await Wallets.newFileSystemWallet(config.walletPath!);
      logger.info(`Built a file system wallet at ${config.walletPath}`);
      break;
    default:
      wallet = await Wallets.newInMemoryWallet();
      logger.info('Built an in memory wallet');
      break;
  }
  return wallet;
};


export async function renewUserCertificate(userId: string, wallet: Wallet) {
  const identity = await wallet.get(userId);
  if (!identity) {
    throw new Error(`User ${userId} not found in wallet`);
  }
  
  // 使用现有凭证创建Fabric CA客户端
  const provider = wallet.getProviderRegistry().getProvider(identity.type);
  const user = await provider.getUserContext(identity, userId);
  
  // 重新注册以获取新证书
  const caClient = buildCAClient();
  const enrollment = await caClient.reenroll(user, []);
  
  // 创建新的身份信息，可以保留原有私钥或生成新的
  const updatedIdentity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(), // 或保留原有私钥
    },
    mspId: identity.mspId,
    type: 'X.509',
  };
  
  // 更新钱包
  await wallet.put(userId, updatedIdentity);
  return updatedIdentity;
}
export { buildCAClient, enrollAdmin, registerAndEnrollUser, enrollUser };
