import { WalletStore } from './walletstore';
import {IDatabase} from 'pg-promise';
import { pgp } from '../../utils/pg_db';

// const db = pgp("postgres://odoo:strong_pg_odoo_password@localhost:5432/postgres");
const SCHEMA = 'fabric_api';
const WALLET_TABLE = 'wallet';

export class PostgreSQLWalletStore implements WalletStore {
	private readonly db: IDatabase<{}>;

    public static async newInstance(connection: string, dbName: string, adminDbName: string = "postgres"): Promise<PostgreSQLWalletStore> {
        try {
            // Create connection to default postgres database
            const adminDb = pgp(`${connection}/${adminDbName}`);

            // Check if database exists
            const dbExists = await adminDb.oneOrNone(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [dbName]
            );

            // Create database if it doesn't exist
            if (!dbExists) {
                await adminDb.none(`CREATE DATABASE ${dbName}`);
                console.log(`Created new database: ${dbName}`);
            }

            // Create new connection to the target database
            const dbConfig = `${connection}/${dbName}`;
            const db = pgp(dbConfig);
            
            await PostgreSQLWalletStore.createTables(db);
            return new PostgreSQLWalletStore(db);
        } catch (error) {
            console.error('Failed to initialize PostgreSQL wallet store:', error);
            throw new Error(`Wallet store initialization failed: ${error}`);
        }
	}

    private static async createTables(db: IDatabase<{}>) {
        // Initialize table structure
        await db.none(`
            CREATE SCHEMA IF NOT EXISTS ${SCHEMA};
            CREATE TABLE IF NOT EXISTS ${SCHEMA}.${WALLET_TABLE} (
                label TEXT PRIMARY KEY,
                data BYTEA NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_${SCHEMA}_${WALLET_TABLE}_label 
            ON ${SCHEMA}.${WALLET_TABLE} (label);
        `);
    }

    private constructor(db: IDatabase<{}>) {
        this.db = db;
    }

    public async remove(label: string): Promise<void> {
        try {
            console.debug('postgreDB wallet remove() label:', label);
            await this.db.none(`DELETE FROM ${SCHEMA}.${WALLET_TABLE} WHERE label = $1`, [label]);
        } catch (error) {
            console.error('Failed to remove wallet entry:', error);
            throw new Error('Wallet entry removal failed');
        }
    }

    public async get(label: string): Promise<Buffer | undefined> {
        try {
            console.debug('postgreDB wallet get() label:', label);
            const result = await this.db.oneOrNone<{ data: Buffer }>(
                `SELECT data FROM ${SCHEMA}.${WALLET_TABLE} WHERE label = $1`,
                [label]
            );
            return result?.data ? Buffer.from(result!.data) : undefined;
        } catch (error) {
            console.error('Failed to get wallet entry:', error);
            throw new Error('Wallet entry retrieval failed');
        }
    }

    public async list(): Promise<string[]> {
        try {
            const result = await this.db.manyOrNone<{ label: string }>(
                `SELECT label FROM ${SCHEMA}.${WALLET_TABLE}`
            );
            return result.map(row => row.label);
        } catch (error) {
            console.error('Failed to list wallet entries:', error);
            throw new Error('Wallet entries listing failed');
        }
    }

    public async deleteAll(): Promise<void> {
        try {
            await this.db.none(`DELETE FROM ${SCHEMA}.${WALLET_TABLE}`);
            console.debug('Cleared all wallet entries');
        } catch (error) {
            console.error('Failed to clear wallet entries:', error);
            throw new Error('Wallet clearance operation failed');
        }
    }

    public async put(label: string, data: Buffer): Promise<void> {
        try {
            console.debug('postgreDB wallet put() label:', label, data.toString());
            await this.db.none(
                `INSERT INTO ${SCHEMA}.${WALLET_TABLE} (label, data)
                 VALUES ($1, $2)
                 ON CONFLICT (label) DO UPDATE SET data = $2`,
                [label, data]
            );
        } catch (error) {
            console.error('Failed to store wallet entry:', error);
            throw new Error('Wallet entry storage failed');
        }
    }
}