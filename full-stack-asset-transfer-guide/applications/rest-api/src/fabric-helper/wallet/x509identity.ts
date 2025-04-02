import {ICryptoSuite, ICryptoKey, User} from 'fabric-common';
import * as crypto from 'crypto';
import {Identity} from './identity';
import {IdentityData} from './identitydata';
import {IdentityProvider} from './identityprovider';
import { Identity as GatewayIdentity, Signer, signers } from '@hyperledger/fabric-gateway';

export interface X509Identity extends Identity {
	type: 'X.509';
	credentials: {
		certificate: string;
		privateKey: string;
	};
}

interface X509IdentityDataV1 extends IdentityData {
	type: 'X.509';
	version: 1;
	credentials: {
		certificate: string;
		privateKey: string;
	};
	mspId: string;
}

export class X509Provider implements IdentityProvider {

	public readonly type: string = 'X.509';
	private readonly cryptoSuite: ICryptoSuite = User.newCryptoSuite();

	public getCryptoSuite(): ICryptoSuite {
		return this.cryptoSuite;
	}

	public fromJson(data: IdentityData): X509Identity {
		if (data.type !== this.type) {
			throw new Error('Invalid identity type: ' + data.type);
		}

		if (data.version === 1) {
			const x509Data: X509IdentityDataV1 = data as X509IdentityDataV1;
			return {
				credentials: {
					certificate: x509Data.credentials.certificate,
					privateKey: x509Data.credentials.privateKey,
				},
				mspId: x509Data.mspId,
				type: 'X.509',
			};
		} else {
			throw new Error(`Unsupported identity version: ${data.version}`);
		}
	}

	public toJson(identity: X509Identity): IdentityData {
		const data: X509IdentityDataV1 = {
			credentials: {
				certificate: identity.credentials.certificate,
				privateKey: identity.credentials.privateKey,
			},
			mspId: identity.mspId,
			type: 'X.509',
			version: 1,
		};
		return data;
	}

	public async getUserContext(identity: X509Identity, name: string): Promise<User> {
		if (!identity) {
			throw Error('X.509 identity is missing');
		} else if (!identity.credentials) {
			throw Error('X.509 identity is missing the credential data.');
		} else if (!identity.credentials.privateKey) {
			throw Error('X.509 identity data is missing the private key.');
		}

		const user: User = new User(name);
		user.setCryptoSuite(this.cryptoSuite);

		const importedKey: ICryptoKey = this.cryptoSuite.createKeyFromRaw(identity.credentials.privateKey.toString());
		await user.setEnrollment(importedKey, identity.credentials.certificate.toString(), identity.mspId);

		return user;
	}

	public getGatewayIdentity(identity: X509Identity): GatewayIdentity {
		return {mspId: identity.mspId, credentials: Buffer.from(identity.credentials.certificate)};
	}

	public getGatewaySigner(identity: X509Identity): Signer {
		return signers.newPrivateKeySigner(crypto.createPrivateKey(Buffer.from(identity.credentials.privateKey)));
	}
}

