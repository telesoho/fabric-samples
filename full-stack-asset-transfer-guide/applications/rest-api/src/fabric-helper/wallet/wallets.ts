import {FileSystemWalletStore} from './filesystemwalletstore';
import {InMemoryWalletStore} from './inmemorywalletstore';
import {Wallet} from './wallet';
import { PostgreSQLWalletStore } from './postgresql_wallet_store';

/**
 * Factory for creating wallets backed by default store implementations.
 * @memberof module:fabric-network
 */
export class Wallets {
	/**
	 * Create a wallet backed by an in-memory (non-persistent) store. Each wallet instance created will have its own
	 * private in-memory store.
	 * @returns {Promise<module:fabric-network.Wallet>} A wallet.
	 */
	public static  newInMemoryWallet(): Promise<Wallet> {
		const store = new InMemoryWalletStore();
		return Promise.resolve(new Wallet(store));
	}

	/**
	 * Create a wallet backed by the provided file system directory.
	 * @param {string} directory A directory path.
	 * @returns {Promise<module:fabric-network.Wallet>} A wallet.
	 */
	public static async newFileSystemWallet(directory: string): Promise<Wallet> {
		const store = await FileSystemWalletStore.newInstance(directory);
		return new Wallet(store);
	}

	/**
	 * Create a wallet backed by a PostgreSQL database.
	 * @param {string} connection The connection string for the PostgreSQL database.
	 * @param {string} [dbName="wallet"] The name of the database to use for the wallet.
	 * @param {string} [adminDbName="postgres"] The name of the admin database to use for the wallet.
	 * @returns {Promise<module:fabric-network.Wallet>} A wallet.
	 */
	public static async newPostgreSQLWallet(connection: string, dbName: string, adminDbName: string): Promise<Wallet> {
		const store = await PostgreSQLWalletStore.newInstance(connection, dbName, adminDbName);
		return new Wallet(store);
	}
}
