import {Identity} from './identity';
import {IdentityData} from './identitydata';
import {IdentityProviderRegistry, newDefaultProviderRegistry} from './identityproviderregistry';
import {WalletStore} from './walletstore';

const encoding = 'utf8';

export class Wallet {
	private readonly providerRegistry = newDefaultProviderRegistry();
	private readonly store: WalletStore;

	public constructor(store: WalletStore) {
		this.store = store;
	}

	public async put(label: string, identity: Identity): Promise<void> {
		const json = this.providerRegistry.getProvider(identity.type).toJson(identity);
		const jsonString = JSON.stringify(json);
		const buffer = Buffer.from(jsonString, encoding) ;
		await this.store.put(label, buffer);
	}

	public async get(label: string): Promise<Identity|undefined> {
		const buffer = await this.store.get(label);
		if (!buffer) {
			return undefined;
		}
		const jsonString = buffer.toString(encoding);
		const json = JSON.parse(jsonString) as IdentityData;
		return this.providerRegistry.getProvider(json.type).fromJson(json);
	}

	public async list(): Promise<string[]> {
		return await this.store.list();
	}

	public async remove(label: string): Promise<void> {
		await this.store.remove(label);
	}

	public getProviderRegistry(): IdentityProviderRegistry {
		return this.providerRegistry;
	}
}
