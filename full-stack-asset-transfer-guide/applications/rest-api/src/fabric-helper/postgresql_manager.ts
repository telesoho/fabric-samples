import { IDatabase, PreparedStatement } from 'pg-promise';
import PgBoss from 'pg-boss';
import { Gateway } from '@hyperledger/fabric-gateway';
import { ChaincodeEvent } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { pgp } from '../utils/pg_db';
import { logger } from '../logger';
import { CoinTransferEventHandler, CoinTransferEventJobData, COIN_TRANSFER_TABLE} from './handlers/coin_transfer_handler';
import { NFTTransferEventHandler, NFTTransferEventJobData, NFT_TRANSFER_TABLE} from './handlers/nft_transfer_handler';
import { UserInfoEventHandler, UserEventJobData, USER_TABLE} from './handlers/user_handler';
import { NFTEventHandler, NFTEventJobData, NFT_TABLE } from './handlers/nft_handler';
import { IContractEventHandler, IContractEventPayload } from './handlers/event_handler';
import { StateStore } from '../utils/stateStore';
import { Connection } from '../connection';
import * as config from '../config';

const COCONIKO_SCHEMA = 'coconiko';

const EVENT_QUEUE_NAME = 'coconiko-event-queue';
const EVENT_ERROR_QUEUE_NAME = 'coconiko-error-queue';

type EventJobData = CoinTransferEventJobData | UserEventJobData | NFTEventJobData | NFTTransferEventJobData;

interface ErrorEventData {
    originalJob: PgBoss.Job<EventJobData>;
    error: string;
    timestamp: string;
}

// see: https://www.postgresql.org/docs/current/datatype-json.html
// In postgreDB: \u0000 is disallowed, as are Unicode escapes representing characters not available in the database encoding
function encodeDocumentKey(key: string) {
    return key.replace(/\u0000/g, '{u0000}');
}

function decodeDocumentKey(key: string) {
    return key.replace(/\{u0000\}/g, '\u0000');
}

const stateStore: StateStore = StateStore.getInstance();

class PostgreSQLManager {
    readonly db: IDatabase<{}>;
    private readonly gateway?: Gateway;
    private boss: PgBoss;
    private eventHandlers: Map<string, IContractEventHandler<IContractEventPayload>>;
    readonly COCONIKO_SCHEMA: string = COCONIKO_SCHEMA;

    public static async create(
        connection: string, 
        dbName: string, 
        adminDbName: string = "postgres",
        gateway?: Gateway,
    ): Promise<PostgreSQLManager> {
        const cn = {
            connectionString: `${connection}/${adminDbName}`,
            allowExitOnIdle : true
        };
        // Create connection to default postgres database
        const dbAdmin = pgp(cn);

        // Check if database exists
        const dbExists = await dbAdmin.oneOrNone(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        // Create database if it doesn't exist
        if (!dbExists) {
            await dbAdmin.none(`CREATE DATABASE ${dbName}`);
            console.log(`Created new database: ${dbName}`);
        }

        dbAdmin.$pool.end();

        const dbConfig = `${connection}/${dbName}`;

        const boss = new PgBoss({
            connectionString: dbConfig,
            // max: 50,
            pollingIntervalSeconds: 0.5,
            application_name: 'fabric_network_api'
        });

        await boss.start();

        cn.connectionString = dbConfig;
        const db = pgp(cn);

        const instance = new PostgreSQLManager(db, boss, gateway);
        await instance.initializeTables();
        await instance.setupContractListener();
        await instance.initializeBossQueues();

        return instance;
    }

    public getEventHandler(eventType: string) {
        return this.eventHandlers.get(eventType);
    }

    public async destroy(): Promise<void> {
        await this.close();
    }

    private constructor(db: IDatabase<{}>, boss: PgBoss, gateway?: Gateway) {
        this.db = db;
        this.gateway = gateway;
        this.boss = boss;
        // Initialize event handlers
        this.eventHandlers = new Map([
            new CoinTransferEventHandler(this),
            new UserInfoEventHandler(this),
            new NFTEventHandler(this),
            new NFTTransferEventHandler(this),
        ].map(handler => [handler.eventType, handler]));
    }

    private async initializeTables(): Promise<void> {
        await this.db.none(`
            SET timezone='UTC';
            CREATE SCHEMA IF NOT EXISTS ${COCONIKO_SCHEMA};
        `);
    
        // Initialize tables for each handler
        for (const handler of this.eventHandlers.values()) {
            await handler.initializeTables();
        }
    }

    public async setupContractListener(): Promise<void> {
        if (!this.gateway) {
            logger.warn('Gateway not initialized, will skip setup contract listener.');
            return;
        }

        try {
            const network = this.gateway.getNetwork(config.channelName);
            
            // Listen for events from the coconiko-coin contract
            const coinEventListener = await network.getChaincodeEvents(
                config.coconikoChainCode
            );
            
            // Process coin contract events asynchronously
            void this.processChaincodeEvents(coinEventListener, 'CoconikoCoinEventListener');
            
            // Listen for events from the coconiko-nft contract
            const nftEventListener = await network.getChaincodeEvents(
                config.coconikoChainCode
            );
            
            // Process NFT contract events asynchronously
            void this.processChaincodeEvents(nftEventListener, 'CoconikoNFTEventListener');
            
            // Store the listeners in the state store to properly clean up later
            this.putListenerObject('CoconikoCoinEventListener', {
                active: true,
                listener: coinEventListener,
                type: 'CONTRACT',
                remove: () => coinEventListener.close()
            });
            
            this.putListenerObject('CoconikoNFTEventListener', {
                active: true,
                listener: nftEventListener,
                type: 'CONTRACT',
                remove: () => nftEventListener.close()
            });
        } catch (error) {
            console.error('Failed to set up contract listeners:', error);
            logger.error('Failed to set up contract listeners', { error });
        }
    }
    
    private async processChaincodeEvents(events: AsyncIterable<ChaincodeEvent>, listenerName: string): Promise<void> {
        try {
            for await (const event of events) {
                console.debug('Received chaincode event:', event);
                await this.handleContractEvent(event);
            }
        } catch (error) {
            console.error(`Error processing events for ${listenerName}:`, error);
            logger.error(`Error processing events for ${listenerName}`, { error });
            
            // Try to restart the listener if possible
            const listener = this.getListeners().get(listenerName);
            if (listener && listener.active) {
                logger.info(`Attempting to restart event listener: ${listenerName}`);
                try {
                    listener.remove();
                    await this.setupContractListener();
                } catch (restartError) {
                    logger.error(`Failed to restart listener ${listenerName}`, { error: restartError });
                }
            }
        }
    }

    private async handleContractEvent(event: ChaincodeEvent): Promise<void> {
        if (event.eventName !== 'CoconikoContractEvent') {
            logger.warn(`Unhandled event type: ${event.eventName}`);
            return;
        }
        
        // Parse the payload from Uint8Array to JSON
        const payloadBytes = event.payload;
        const payloadString = new TextDecoder().decode(payloadBytes);
        const payload = JSON.parse(payloadString || '{}');

        for (let index = 0; index < payload.eventCount; index++) {
            const e = payload.events[index];
            const handler = this.eventHandlers.get(e.type);

            if (!handler) {
                logger.warn(`Unhandled event type: ${e.type}`);
                continue;
            }

            try {
                if (!handler.validatePayload(e)) {
                    logger.error('Invalid event payload', e);
                    continue;
                }
    
                await handler.handleContractEvent(e);
            } catch (error) {
                console.error(error);
                if (error instanceof Error) {
                    handler.handleContractError(error, e);
                } else {
                    logger.error('An unknown error occurred', { error });
                }
            }
        }
    }

    private putListenerObject(name: string, listener: any): void {
        this.getListeners().set(name, listener);
    }

    private getListeners(): Map<string, any> {
        let listeners = stateStore.get('LISTENERS') as Map<string, any>;
        if (!listeners) {
            listeners = new Map();
            stateStore.set('LISTENERS', listeners);
        }
        return listeners;
    }

    public async close(): Promise<void> {
        console.info('Stopping ...');
        
        // Clear all listeners
        const listeners = this.getListeners();
        for (const [name, listener] of listeners.entries()) {
            if (listener.active) {
                listener.remove();
                listener.active = false;
            }
        }
        listeners.clear();

        if (this.boss) {
            await this.boss.stop();
        }
        // REMOVE lines because allowExitOnIdle:true
        // if (this.db) {
        //     await this.db.$pool.end();
        // }
    }    

    private async initializeBossQueues() {
        if (!this.boss) throw new Error('PgBoss instance not initialized');

        // Create both queues during initialization
        await this.boss.createQueue(EVENT_QUEUE_NAME);
        await this.boss.createQueue(EVENT_ERROR_QUEUE_NAME);

        const queueOptions = {
            batchSize: 1,
            teamSize: 1,
            teamConcurrency: 1
        };
        

        const eventHandler: PgBoss.WorkHandler<EventJobData> = async ([job]) => {
            try {
                console.debug("EVENT JOB QUEUE", job);
                await this.handleJobEvent(job);
                await this.boss.complete(EVENT_QUEUE_NAME, job.id);
            } catch (error) {
                // Send failed job to error queue with error details
                await this.boss.fail(EVENT_QUEUE_NAME, job.id);
                await this.boss.send(EVENT_ERROR_QUEUE_NAME, {
                    originalJob: job,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                });
                throw error; // Re-throw to mark job as failed
            }
        };

        await this.boss.work(EVENT_QUEUE_NAME, queueOptions, eventHandler);

        // Add error queue worker
        const errorHandler: PgBoss.WorkHandler<ErrorEventData> = async ([job]) => {
            try {
                console.debug("ERROR JOB QUEUE", job);
                const { originalJob } = job.data;
                const docKey: string = decodeDocumentKey(originalJob.data.documentKey);
                const document = await this.getBlockchainDocument(docKey);

                const handler = this.eventHandlers.get(originalJob.data.eventType);
                await handler?.syncDocument(document);
                await this.boss.deleteJob(EVENT_ERROR_QUEUE_NAME, job.id);

                return true; // Mark job as completed
            } catch (error) {
                console.error('Error queue processing failed:', error);
                // Implement exponential backoff or dead-letter queue here
                throw error;
            }
        };

        // Configure error queue with retry policy
        const errorQueueOptions = {
            batchSize: 1,
            teamSize: 1,
            newJobCheckInterval: 1000, // Slower retry interval
            retryLimit: 3, // Max retry attempts
            retryDelay: 5000 // 5 seconds between retries
        };

        await this.boss.work(EVENT_ERROR_QUEUE_NAME, errorQueueOptions, errorHandler);
    }

    public async insertToJob(data: EventJobData): Promise<void> {
        if (!this.boss) throw new Error('Queue system not initialized');
        const input = {
            id: data.id,
            name: EVENT_QUEUE_NAME,
            data: data,
        }

        this.boss.insert([input]);
    }

    private async handleJobEvent(job: PgBoss.Job<EventJobData>): Promise<void> {
        const handler = this.eventHandlers.get(job.data.eventType);

        await handler?.handleJobEvent(job);
    }

    public async getBlockchainDocument(documentKey: string): Promise<any> {
        try {
            if (!this.gateway) {
                throw new Error('Gateway not initialized');
            }
            
            const network = this.gateway.getNetwork(config.channelName);
            const contract = network.getContract(config.coconikoChainCode);

            const result = await contract.evaluateTransaction(
                'GetStateByKey', 
                documentKey
            );

            return JSON.parse(new TextDecoder().decode(result));
        } catch (error) {
            throw new Error(`Failed to retrieve blockchain document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public async balanceOf(accountIds: string[]): Promise<Record<string, number>> {
        try {
            const results = await this.db.manyOrNone<{ account_id: string; balance: number }>(
                `SELECT account_id, balance
                 FROM ${COCONIKO_SCHEMA}.${USER_TABLE}
                 WHERE account_id IN ($1:list)`,
                [accountIds]
            );

            return results.reduce((acc, row) => {
                acc[row.account_id] = row.balance;
                return acc;
            }, {} as Record<string, number>);
        } catch (error) {
            console.error('Balance query failed:', error);
            throw new Error(`Failed to retrieve balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }    

    public async getTotalBalanceByStatus(isActive: boolean): Promise<number> {
        try {
            // const r = await this.db.many(`SELECT * FROM ${COCONIKO_SCHEMA}.${USER_TABLE} where active = ${isActive}`)
            // console.info(r);

            const result = await this.db.one<{ total: number }>(
                `SELECT COALESCE(SUM(balance), 0) as total
                 FROM ${COCONIKO_SCHEMA}.${USER_TABLE}
                 WHERE active = $1`,
                [isActive]
            );
            
            return result.total;
        } catch (error) {
            console.error('Total balance query failed:', error);
            throw new Error(`Failed to calculate total balance: ${ 
                error instanceof Error ? error.message : 'Unknown error' 
            }`);
        }
    }

    /**
     * 総トークン供給量の取得
     */
    public async getTotalSupply(params: {
        startDate?: Date;
        endDate?: Date;
        activeUserOnly?: Boolean;
    }): Promise<number> {
        // const r = await this.db.many(`SELECT * FROM ${COCONIKO_SCHEMA}.${TRANSFER_TABLE}`)
        // console.info(r);
        try {
            const whereClauses: string[] = [`t.from_user = '0x0'`];
            const queryParams: Record<string, any> = {};

            // Handle date filters
            if (params.startDate) {
                whereClauses.push('event_timestamp >= $/startDate/');
                queryParams.startDate = params.startDate.toISOString();
            }
            if (params.endDate) {
                whereClauses.push('event_timestamp <= $/endDate/');
                queryParams.endDate = params.endDate.toISOString();
            }

            // Handle active users filter
            let joinClause = '';
            if (params.activeUserOnly) {
                joinClause = `
                    JOIN ${COCONIKO_SCHEMA}.${USER_TABLE} u_to ON t.to_user = u_to.account_id
                `;
                whereClauses.push('u_to.active = true');
            }

            // const ps: PreparedStatement = new PreparedStatement({
            //     name: 'test',
            //     text: `SELECT COALESCE(SUM(t.amount), 0) as total
            //     FROM ${COCONIKO_SCHEMA}.${TRANSFER_TABLE} t
            //     ${joinClause}
            //     ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`,
            //     values: [queryParams]
            // });
            // console.info(ps);

            const result = await this.db.one<{ total: string }>(
                `SELECT COALESCE(SUM(t.amount), 0) as total
                 FROM ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE} t
                 ${joinClause}
                 ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`,
                queryParams
            );

            return parseInt(result.total);
        } catch (error) {
            console.error('Total supply calculation failed:', error);
            throw new Error(`Failed to calculate total supply: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }

    public async getTransferEventsCount(params: {
        accountId: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ total: number }> {
        try {
            const queryParams = {
                accountId: params.accountId,
                startDate: params.startDate?.toISOString(),
                endDate: params.endDate?.toISOString(),
            };

            const whereClauses: string[] = [
                `(from_user = $/accountId/ OR to_user = $/accountId/)`
            ];

            if (params.startDate) {
                whereClauses.push(`event_timestamp >= $/startDate/`);
            }
            if (params.endDate) {
                whereClauses.push(`event_timestamp <= $/endDate/`);
            }

            const totalResult = await this.db.one<{ count: string }>(
                `SELECT COUNT(*) 
                 FROM ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE}
                 WHERE ${whereClauses.join(' AND ')}`,
                queryParams
            );

            return {
                total: parseInt(totalResult.count)
            };
        } catch (error) {
            console.error('Transfer events query failed:', error);
            throw new Error(`Failed to retrieve transactions: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }

    public async getTransferEvents(params: {
        accountId: string;
        startDate?: Date;
        endDate?: Date;
        pageSize?: number;
        skip?: number;
    }): Promise<{ transactions: any[] }> {
        try {
            // 使用命名参数对象代替位置参数
            const queryParams = {
                accountId: params.accountId,
                startDate: params.startDate?.toISOString(),
                endDate: params.endDate?.toISOString(),
                pageSize: params.pageSize,
                skip: params.skip ?? 0
            };

            // 修改where条件使用命名参数语法
            const whereClauses: string[] = [
                `(from_user = $/accountId/ OR to_user = $/accountId/)`
            ];

            if (params.startDate) {
                whereClauses.push(`event_timestamp >= $/startDate/`);
            }
            if (params.endDate) {
                whereClauses.push(`event_timestamp <= $/endDate/`);
            }

            // 修改分页查询使用命名参数
            const limitClause = params.pageSize !== undefined 
                ? `LIMIT $/pageSize/ OFFSET $/skip/` 
                : '';

            const transactions = await this.db.manyOrNone(
                `SELECT 
                    txid as "txid",
                    from_user as "from",
                    to_user as "to",
                    amount,
                    event_timestamp as "timestamp",
                    CASE
                        WHEN from_user = $/accountId/ THEN 'spend'
                        ELSE 'received'
                    END as type
                 FROM ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE}
                 WHERE ${whereClauses.join(' AND ')}
                 ORDER BY event_timestamp DESC
                 ${limitClause}`,
                queryParams
            );

            return {
                transactions: transactions.map(tx => ({
                    ...tx,
                    amount: Number(tx.amount),
                    timestamp: tx.timestamp
                }))
            };
        } catch (error) {
            console.error('Transfer events query failed:', error);
            throw new Error(`Failed to retrieve transactions: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }

    public async getUserSummary(params: {
        startDate?: Date;
        endDate?: Date;
    }): Promise<{ receivedFromSystem: number; spentToOthers: number }> {
        try {
            const queryParams: Record<string, any> = {};
            const whereClauses: string[] = [];

            // Date filtering
            if (params.startDate) {
                whereClauses.push('t.event_timestamp >= $/startDate/');
                queryParams.startDate = params.startDate.toISOString();
            }
            if (params.endDate) {
                whereClauses.push('t.event_timestamp <= $/endDate/');
                queryParams.endDate = params.endDate.toISOString();
            }

            const result = await this.db.one<{
                minted: string;
                used: string;
            }>(`
                SELECT
                    COALESCE(SUM(CASE 
                        WHEN t.from_user = '0x0' AND u_to.active = true THEN t.amount 
                        ELSE 0 
                    END), 0) as "minted",
                    COALESCE(SUM(CASE 
                        WHEN u_from.active = true THEN t.amount 
                        ELSE 0 
                    END), 0) as "used"
                FROM ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE} t
                LEFT JOIN ${COCONIKO_SCHEMA}.${USER_TABLE} u_to 
                    ON t.to_user = u_to.account_id
                LEFT JOIN ${COCONIKO_SCHEMA}.${USER_TABLE} u_from 
                    ON t.from_user = u_from.account_id
                ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}
            `, queryParams);

            return {
                receivedFromSystem: parseInt(result.minted) || 0,
                spentToOthers: parseInt(result.used) || 0
            };
        } catch (error) {
            console.error('User summary query failed:', error);
            throw new Error(`Failed to get user summary: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }

    public async getNFT(nftId: string): Promise<object> {
        try {
            const queryParams: Record<string, any> = {};

            const nft = await this.db.oneOrNone<{
                nft_id: string;
                owner: string;
                metadata: object;
                created_at: string;
                burned: boolean;
            }
            >(`
                SELECT 
                    nft_id,
                    owner,
                    metadata,
                    created_at,
                    burned
                FROM ${COCONIKO_SCHEMA}.${NFT_TABLE} t
                WHERE t.nft_id = '${nftId}' limit 1
            `);

            if(!nft) {
                return {};
            }


            // Date filtering
            const his = await this.db.manyOrNone(`
                SELECT t.from_user, t.to_user, t.nft_id, t.event_timestamp
                FROM ${COCONIKO_SCHEMA}.${NFT_TRANSFER_TABLE} t
                LEFT JOIN ${COCONIKO_SCHEMA}.${NFT_TABLE} n 
                    ON n.nft_id = t.nft_id
                WHERE t.nft_id = '${nftId}'
            `, queryParams);

            return {
                "tokenId": nft.nft_id,
                "metadata": nft.metadata,
                "currentOwner": nft.owner,
                "created": nft.created_at,
                "transactionHistory": his.map((item) => {
                    return {
                        from: item.from_user,
                        to: item.to_user,
                        timestamp: item.event_timestamp
                    }
                })
            };
        } catch (error) {
            console.error('Get NFT query failed:', error);
            throw new Error(`Failed to get NFT: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }


    public async getMyNFTs(accountId: string): Promise<object> {
        try {
            console.debug(accountId);
            const nfts = await this.db.manyOrNone<{
                nft_id: string;
                owner: string;
                creator: string;
                metadata: object;
                created_at: string;
                burned: boolean;
            }
            >(`
                SELECT 
                    nft_id,
                    owner,
                    creator,
                    metadata,
                    created_at,
                    burned
                FROM ${COCONIKO_SCHEMA}.${NFT_TABLE} t
                WHERE t.owner = '${accountId}'
            `);

            if(!nfts) {
                return [];
            }

            return nfts;
        } catch (error) {
            console.error('Get NFT query failed:', error);
            throw new Error(`Failed to get NFT: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }

    public async select(selectSql: string, params?: Record<string, any>): Promise<any[]> {
        try {
            // Validate SQL contains only SELECT statements
            if (!selectSql.trim().toUpperCase().startsWith('SELECT')) {
                throw new Error('Only SELECT queries are allowed');
            }

            // Use parameterized query to prevent SQL injection
            return await this.db.manyOrNone(selectSql, params || {});
        } catch (error) {
            console.error('Query execution failed:', error);
            throw new Error(`Database query failed: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`);
        }
    }
}

export {PostgreSQLManager, encodeDocumentKey, decodeDocumentKey};