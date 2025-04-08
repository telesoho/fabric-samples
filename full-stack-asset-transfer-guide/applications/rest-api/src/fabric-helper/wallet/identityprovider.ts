import {ICryptoSuite, User} from '../../../fabric-common';

import {Identity} from './identity';
import {IdentityData} from './identitydata';
import { Identity as GatewayIdentity, Signer } from '@hyperledger/fabric-gateway';

export interface IdentityProvider {
	readonly type: string;
	getCryptoSuite(): ICryptoSuite;
	fromJson(data: IdentityData): Identity;
	toJson(identity: Identity): IdentityData;
	getUserContext(identity: Identity, name: string): Promise<User>;
	getGatewayIdentity(identity: Identity): GatewayIdentity;
	getGatewaySigner(identity: Identity): Signer;
}
