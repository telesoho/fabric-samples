import {ICryptoSuite, ICryptoKey, User} from 'fabric-common';
import * as crypto from 'crypto';
import {Identity} from './identity';
import {IdentityData} from './identitydata';
import {IdentityProvider} from './identityprovider';
import { Identity as GatewayIdentity, Signer, signers } from '@hyperledger/fabric-gateway';

export interface S509Identity extends Identity {
	type: 'S.509';
	credentials: {
		certificate: string;
		privateKey: string;
		signCert: string;
		expiryDate: string;
	};
}

interface S509IdentityDataV1 extends IdentityData {
	type: 'S.509';
	version: 1;
	credentials: {
		certificate: string;
		privateKey: string;
		signCert: string;
		expiryDate: string;
	};
	mspId: string;
}

export class S509Provider implements IdentityProvider {
	public readonly type: string = 'S.509';
	private readonly cryptoSuite: ICryptoSuite = User.newCryptoSuite();

	public getCryptoSuite(): ICryptoSuite {
		return this.cryptoSuite;
	}

	public fromJson(data: IdentityData): S509Identity {
		if (data.type !== this.type) {
			throw new Error('Invalid identity type: ' + data.type);
		}

		if (data.version === 1) {
			const s509Data: S509IdentityDataV1 = data as S509IdentityDataV1;
			return {
				credentials: {
					certificate: s509Data.credentials.certificate,
					privateKey: s509Data.credentials.privateKey,
					signCert: s509Data.credentials.signCert,
					expiryDate: s509Data.credentials.expiryDate,
				},
				mspId: s509Data.mspId,
				type: 'S.509',
			};
		} else {
			throw new Error(`Unsupported identity version: ${data.version}`);
		}
	}

	public toJson(identity: S509Identity): IdentityData {
		const data: S509IdentityDataV1 = {
			credentials: {
				certificate: identity.credentials.certificate,
				privateKey: identity.credentials.privateKey,
				signCert: identity.credentials.signCert,
				expiryDate: identity.credentials.expiryDate,
			},
			mspId: identity.mspId,
			type: 'S.509',
			version: 1,
		};
		return data;
	}

	public async getUserContext(identity: S509Identity, name: string): Promise<User> {
		if (!identity) {
			throw Error('S.509 identity is missing');
		} else if (!identity.credentials) {
			throw Error('S.509 identity is missing the credential data.');
		} else if (!identity.credentials.privateKey) {
			throw Error('S.509 identity data is missing the private key.');
		} else if (!identity.credentials.signCert) {
			throw Error('S.509 identity data is missing the sign certificate.');
		} else if (!identity.credentials.expiryDate) {
			throw Error('S.509 identity data is missing the expiry date.');
		}

		const user: User = new User(name);
		user.setCryptoSuite(this.cryptoSuite);

		const importedKey: ICryptoKey = this.cryptoSuite.createKeyFromRaw(identity.credentials.privateKey.toString());
		await user.setEnrollment(importedKey, identity.credentials.certificate.toString(), identity.mspId);

		return user;
	}

	public getGatewayIdentity(identity: S509Identity): GatewayIdentity {
		return {mspId: identity.mspId, credentials: Buffer.from(identity.credentials.certificate)};
	}

	public getGatewaySigner(identity: S509Identity): Signer {
		return signers.newPrivateKeySigner(crypto.createPrivateKey(identity.credentials.privateKey));
	}		
}
