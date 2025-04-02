import {IdentityProvider} from './identityprovider';
import {X509Provider} from './x509identity';

const defaultProviders: IdentityProvider[] = [
	new X509Provider(),
];

export class IdentityProviderRegistry {
	private readonly providers: Map<string, IdentityProvider> = new Map();

	public getProvider(type: string): IdentityProvider {
		const provider: IdentityProvider | undefined = this.providers.get(type);
		if (!provider) {
			throw new Error('Unknown identity type: ' + type);
		}
		return provider;
	}

	public addProvider(provider: IdentityProvider): void {
		this.providers.set(provider.type, provider);
	}
}

export function newDefaultProviderRegistry(): IdentityProviderRegistry {
	const registry = new IdentityProviderRegistry();
	defaultProviders.forEach((provider) => registry.addProvider(provider));
	return registry;
}
