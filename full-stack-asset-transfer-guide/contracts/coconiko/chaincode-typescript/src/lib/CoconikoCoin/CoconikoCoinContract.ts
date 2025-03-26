import { Context, Contract } from 'fabric-contract-api';
import { CoconikoCoin } from './CoconikoCoin';
import { SystemInfo } from '../SystemInfo';
import { UserInfo } from '../UserInfo';
import { CoinTransferEvent } from './CoinTransferEvent';
import { ContractEvent } from '../ContractEvent';

// Define org MSPID
const orgMSPID = 'sdlMSP';

// System account ID for token minting
const SystemId = '0x0';

/**
 * Interface for token supply summary
 */
interface TokenSummary {
    totalSupply: number;
    totalActiveSupply: number;
}

/**
 * Interface for usage summary
 */
interface UsageSummary {
    totalMinted: number;
    totalUsed: number;
}

/**
 * Interface for pagination response
 */
interface PaginatedResponse<T> {
    results: T[];
    metadata: {
        RecordsCount: number;
        Bookmark: string;
    };
}

/**
 * Contract for managing CoconikoCoin tokens
 */
class CoconikoCoinContract extends Contract {

    /**
     * Creates a new CoconikoCoinContract instance
     */
    constructor() {
        super('CoconikoCoinContract');
    }

    /**
     * Gets the token name
     * @param ctx The transaction context
     * @returns The token name
     */
    async TokenName(ctx: Context): Promise<string> {
        return 'coconiko-coin';
    }

    /**
     * Gets the total supply of tokens
     * @param ctx The transaction context
     * @param startDate Optional start date for filtering
     * @param endDate Optional end date for filtering
     * @returns A summary of token supply
     */
    async TotalSupply(ctx: Context, startDate?: string, endDate?: string): Promise<TokenSummary> {
        const selector: {
            docType: string;
            timestamp?: {
                $gte?: string;
                $lte?: string;
            };
        } = {
            docType: CoinTransferEvent.docType()
        };
        
        const timestamp: { $gte?: string; $lte?: string } = {};
        if (startDate) {
            timestamp.$gte = startDate;
        }
        if (endDate) {
            timestamp.$lte = endDate;
        }

        if (Object.keys(timestamp).length > 0) {
            selector.timestamp = timestamp;
        }

        // Search and sort the expirable localcoin
        const queryString = JSON.stringify({
            selector,
            fields: ['docType', 'from', 'to', 'amount', 'expirationDate', 'timestamp'],
            sort: [{
                timestamp: 'asc'
            }]
        });
        console.debug(queryString);

        const pageSize = 100;
        let done = false;
        let summary: TokenSummary = {
            totalSupply: 0,
            totalActiveSupply: 0
        };
        let bookmark: string | undefined;

        while (!done) {
            const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
            if (metadata.fetchedRecordsCount === 0) {
                done = true;
                continue;
            }
            bookmark = metadata.bookmark;
            let res = await iterator.next();
            while (!res.done) {
                if (res.value && res.value.value.toString()) {
                    const cv = CoinTransferEvent.fromBuffer(res.value.value);
                    if (cv.data.from === SystemId) {
                        const toUserInfo = await UserInfo.fromState(ctx, cv.data.to);
                        if (toUserInfo.data.active) {
                            summary.totalActiveSupply += cv.data.amount;
                        }
                        summary.totalSupply += cv.data.amount;
                    }
                    res = await iterator.next();
                }
            }
            await iterator.close();
        }

        return summary;
    }

    /**
     * Initializes the contract
     * @param ctx The transaction context
     */
    async Initialize(ctx: Context): Promise<void> {
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('Client is not authorized to set the name and symbol of the token');
        }

        const systemInfoBytes = await ctx.stub.getState(SystemInfo.getKey());
        if (!systemInfoBytes || systemInfoBytes.length === 0) {
            const systemInfo = new SystemInfo();
            await systemInfo.putState(ctx);
        } else {
            console.log('Contract is already initialized');
        }
    }

    /**
     * Creates a new user account
     * @param ctx The transaction context
     * @returns The created user account
     */
    async CreateUserAccount(ctx: Context): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();
        const userInfo = await UserInfo.createUserAccount(ctx);
        await ContractEvent.commitEvents(ctx);
        return userInfo.toJSON();
    }

    /**
     * Gets the client account information
     * @param ctx The transaction context
     * @returns The client account information
     */
    async ClientAccountInfo(ctx: Context): Promise<Record<string, unknown>> {
        const userInfo = await UserInfo.fromState(ctx, ctx.clientIdentity.getID());
        return userInfo.toJSON();
    }

    /**
     * Activates or deactivates a user
     * @param ctx The transaction context
     * @param active Whether the user should be active
     * @returns The updated user account
     */
    async ActiveUser(ctx: Context, active: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();
        const userInfo = await UserInfo.getOrCreateCurrentUserAccount(ctx);
        const activeBool = active === 'true';
        if (userInfo.data.active !== activeBool) {
            userInfo.data.active = activeBool;
            await userInfo.putState(ctx);
        }
        await ContractEvent.commitEvents(ctx);
        return userInfo.toJSON();
    }

    /**
     * Mints new tokens
     * @param ctx The transaction context
     * @param amount Amount to mint
     * @param days Number of days until expiration
     * @returns The minted coin
     */
    async Mint(ctx: Context, amount: string, days: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('Client is not authorized to mint new tokens');
        }

        const minter = ctx.clientIdentity.getID();

        const amountInt = parseInt(amount);
        if (amountInt <= 0) {
            throw new Error('Mint amount must be a positive integer');
        }

        // For expirable coins, create a coin and add it to the Fabric Network
        const daysInt = parseInt(days) || 0;
        if (daysInt < 0) {
            throw new Error('Days must >= 0 and must be a positive integer');
        }

        const coin = new CoconikoCoin(amountInt, daysInt, minter);
        const coinKey = coin.getKey(ctx);
        const oldLocalcoinBytes = await ctx.stub.getState(coinKey);
        if (oldLocalcoinBytes && oldLocalcoinBytes.length !== 0) {
            const oldLocalcoin = CoconikoCoin.fromBuffer(oldLocalcoinBytes);
            oldLocalcoin.data.amount += coin.data.amount;
            await oldLocalcoin.putState(ctx);
        } else {
            await coin.putState(ctx);
        }

        // Increase minter balance
        const userInfo = await UserInfo.fromState(ctx, minter);
        userInfo.data.balance += coin.data.amount;
        await userInfo.putState(ctx);

        // Increase totalSupply
        const systemInfo = await SystemInfo.fromState(ctx);
        systemInfo.data.totalSupply += coin.data.amount;
        await systemInfo.putState(ctx);

        // Emit the Transfer event
        const from = SystemId;
        const to = minter;
        const transferEvent = new CoinTransferEvent(from, to, coin.data.amount, coin.data.expirationDate);
        await transferEvent.putState(ctx);
        
        // Commit event
        await ContractEvent.commitEvents(ctx);
        return coin.toJSON();
    }

    /**
     * Gets the balance of a user
     * @param ctx The transaction context
     * @param owner The owner account ID
     * @returns The balance
     */
    async BalanceOf(ctx: Context, owner: string): Promise<number> {
        const ownerInfo = await UserInfo.fromState(ctx, owner);
        return ownerInfo.data.balance;
    }

    /**
     * Queries assets with pagination
     * @param ctx The transaction context
     * @param queryString Query string in CouchDB syntax
     * @param pageSize Number of records per page
     * @param bookmark Bookmark for pagination
     * @returns JSON string with query results and pagination metadata
     */
    async queryAssetsWithPagination(ctx: Context, queryString: string, pageSize: string, bookmark?: string): Promise<string> {
        const pageSizeInt = parseInt(pageSize);
        const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSizeInt, bookmark);
        console.log(metadata);

        const results = await this._getAllResults(iterator, false);

        const ResponseMetadata = {
            RecordsCount: metadata.fetchedRecordsCount,
            Bookmark: metadata.bookmark,
        };

        const returnData: PaginatedResponse<unknown> = { 
            results: results, 
            metadata: ResponseMetadata 
        };

        return JSON.stringify(returnData);
    }

    /**
     * Burns expired coins
     * @param ctx The transaction context
     * @param owner The owner account ID
     * @param expirationDate The expiration date of the coin
     * @returns The burned coin or a message indicating the coin was already burned
     */
    async BurnExpired(ctx: Context, owner: string, expirationDate: string): Promise<Record<string, unknown> | string> {
        ContractEvent.initEvents();

        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('Client is not authorized to burn coins');
        }

        const coin = await CoconikoCoin.fromState(ctx, owner, expirationDate);
        if (coin.data.burned) {
            return 'Coin already burned';
        }

        coin.data.burned = true;
        await coin.putState(ctx);

        // Decrease owner balance
        const userInfo = await UserInfo.fromState(ctx, owner);
        if (userInfo.data.balance < coin.data.amount) {
            throw new Error('Out of user balance, please contact administrator.');
        }
        userInfo.data.balance -= coin.data.amount;
        await userInfo.putState(ctx);

        const systemInfo = await SystemInfo.fromState(ctx);
        if (systemInfo.data.totalSupply < coin.data.amount) {
            throw new Error('Out of system balance, please contact administrator.');
        }
        systemInfo.data.totalSupply -= coin.data.amount;
        await systemInfo.putState(ctx);

        // Emit the Transfer event
        const from = owner;
        const to = SystemId;
        const transferEvent = new CoinTransferEvent(from, to, coin.data.amount, coin.data.expirationDate);
        await transferEvent.putState(ctx);

        // Commit events
        await ContractEvent.commitEvents(ctx);
        return coin.toJSON();
    }

    /**
     * Gets a summary of token usage
     * @param ctx The transaction context
     * @param startDate Optional start date for filtering
     * @param endDate Optional end date for filtering
     * @returns A summary of token usage
     */
    async Summary(ctx: Context, startDate?: string, endDate?: string): Promise<UsageSummary> {
        const selector: {
            docType: string;
            timestamp?: {
                $gte?: string;
                $lte?: string;
            };
        } = {
            docType: CoinTransferEvent.docType()
        };
        
        const timestamp: { $gte?: string; $lte?: string } = {};
        if (startDate) {
            timestamp.$gte = startDate;
        }
        if (endDate) {
            timestamp.$lte = endDate;
        }

        if (Object.keys(timestamp).length > 0) {
            selector.timestamp = timestamp;
        }

        // Search and sort the expirable localcoin
        const queryString = JSON.stringify({
            selector,
            fields: ['docType', 'from', 'to', 'amount', 'expirationDate', 'timestamp'],
            sort: [{
                timestamp: 'asc'
            }]
        });
        console.debug(queryString);

        const pageSize = 100;
        let done = false;
        let summary: UsageSummary = {
            totalMinted: 0,
            totalUsed: 0
        };
        let bookmark: string | undefined;

        while (!done) {
            const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
            if (metadata.fetchedRecordsCount === 0) {
                done = true;
                continue;
            }
            bookmark = metadata.bookmark;
            let res = await iterator.next();
            while (!res.done) {
                console.debug(res.value.key);
                if (res.value && res.value.value.toString()) {
                    const cv = CoinTransferEvent.fromBuffer(res.value.value);
                    if (cv.data.from === SystemId) {
                        const toUserInfo = await UserInfo.fromState(ctx, cv.data.to);
                        if (toUserInfo.data.active) {
                            summary.totalMinted += cv.data.amount;
                        }
                    }
                    if (cv.data.from !== SystemId) {
                        const fromUserInfo = await UserInfo.fromState(ctx, cv.data.from);
                        if (fromUserInfo.data.active) {
                            summary.totalUsed += cv.data.amount;
                        }
                    }
                    res = await iterator.next();
                }
            }
            await iterator.close();
        }

        return summary;
    }

    /**
     * Transfers tokens from the current client to another account
     * @param ctx The transaction context
     * @param to The destination account ID
     * @param amount The amount to transfer
     * @returns The transfer event
     */
    async Transfer(ctx: Context, to: string, amount: string): Promise<Record<string, unknown>> {
        const from = ctx.clientIdentity.getID();
        return this.TransferFrom(ctx, from, to, amount);
    }

    /**
     * Transfers tokens from one account to another
     * @param ctx The transaction context
     * @param from The source account ID
     * @param to The destination account ID
     * @param amount The amount to transfer
     * @returns The transfer event
     */
    async TransferFrom(ctx: Context, from: string, to: string, amount: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const operator = ctx.clientIdentity.getID();

        if (operator !== from && !ctx.clientIdentity.assertAttributeValue('role', 'admin')) {
            throw new Error('Client is not authorized to transfer');
        }

        if (from === to) {
            throw new Error('Cannot transfer to self');
        }

        // Convert value from string to int
        const amountInt = parseInt(amount);

        if (amountInt <= 0) {
            throw new Error('Transfer amount must be a positive integer');
        }

        const fromUserInfo = await UserInfo.fromState(ctx, from);
        if (fromUserInfo.data.balance < amountInt) {
            throw new Error('Client account has insufficient funds.');
        }

        // Search and sort the expirable localcoin
        const queryString = JSON.stringify({
            selector: {
                docType: CoconikoCoin.docType(),
                owner: from,
                burned: false,
            },
            sort: [{
                expirationDate: 'asc'
            }]
        });
        const iterator = await ctx.stub.getQueryResult(queryString);
        let res = await iterator.next();
        // transfer expirable localcoin
        let remainAmount = amountInt;
        while (!res.done && remainAmount > 0) {
            console.debug(res.value.key);
            if (res.value && res.value.value.toString()) {
                let coin = CoconikoCoin.fromBuffer(res.value.value);
                console.debug('remainAmount', remainAmount, coin, to);
                remainAmount = await this._transfer_coin(ctx, coin, to, remainAmount);
            }
            res = await iterator.next();
        }
        await iterator.close();

        const toUserInfo = await UserInfo.fromState(ctx, to);
        toUserInfo.data.balance += amountInt;
        fromUserInfo.data.balance -= amountInt;
        await toUserInfo.putState(ctx);
        await fromUserInfo.putState(ctx);

        // Emit the Transfer event
        const transferEvent = new CoinTransferEvent(from, to, amountInt);
        await transferEvent.putState(ctx);

        // Commit events
        await ContractEvent.commitEvents(ctx);
        return transferEvent.toJSON();
    }

    /**
     * Transfers a coin from one account to another
     * @param ctx The transaction context
     * @param fromLocalcoin The source coin
     * @param to The destination account ID
     * @param remainAmount The remaining amount to transfer
     * @returns The remaining amount after the transfer
     */
    async _transfer_coin(ctx: Context, fromLocalcoin: CoconikoCoin, to: string, remainAmount: number): Promise<number> {
        const toLocalcoinKey = CoconikoCoin.createKey(ctx, to, fromLocalcoin.data.expirationDate);

        if (remainAmount >= fromLocalcoin.data.amount) {
            let toLocalcoin: CoconikoCoin;
            const oldToLocalcoinBytes = await ctx.stub.getState(toLocalcoinKey);
            if (oldToLocalcoinBytes && oldToLocalcoinBytes.length !== 0) {
                const oldToLocalcoin = CoconikoCoin.fromBuffer(oldToLocalcoinBytes);
                toLocalcoin = oldToLocalcoin;
                toLocalcoin.data.amount += fromLocalcoin.data.amount;
            } else {
                toLocalcoin = CoconikoCoin.fromJSON(fromLocalcoin.toJSON());
                toLocalcoin.data.owner = to;
                toLocalcoin.data.amount = fromLocalcoin.data.amount;
            }
            console.debug('fromLocalcoin', fromLocalcoin);
            console.debug('toLocalcoin', toLocalcoin);
            await fromLocalcoin.removeState(ctx);
            await toLocalcoin.putState(ctx);
            remainAmount -= fromLocalcoin.data.amount;
        } else {
            let toLocalcoin: CoconikoCoin;
            const oldToLocalcoinBytes = await ctx.stub.getState(toLocalcoinKey);
            if (oldToLocalcoinBytes && oldToLocalcoinBytes.length !== 0) {
                const oldToLocalcoin = CoconikoCoin.fromBuffer(oldToLocalcoinBytes);
                toLocalcoin = oldToLocalcoin;
                toLocalcoin.data.amount += remainAmount;
            } else {
                toLocalcoin = CoconikoCoin.fromJSON(fromLocalcoin.toJSON());
                toLocalcoin.data.owner = to;
                toLocalcoin.data.amount = remainAmount;
            }
            fromLocalcoin.data.amount -= remainAmount;
            console.debug('fromLocalcoin', fromLocalcoin);
            console.debug('toLocalcoin', toLocalcoin);
            await fromLocalcoin.putState(ctx);
            await toLocalcoin.putState(ctx);

            remainAmount = 0;
        }

        return remainAmount;
    }

    /**
     * Gets all results from an iterator
     * @param iterator The iterator
     * @param isHistory Whether the iterator is for history
     * @returns An array of results
     */
    async _getAllResults(iterator: any, isHistory?: boolean): Promise<unknown[]> {
        let allResults: unknown[] = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes: Record<string, unknown> = {};
                console.log(res.value.value.toString('utf8'));
                if (isHistory && isHistory === true) {
                    jsonRes.TxId = res.value.txId;
                    jsonRes.Timestamp = res.value.timestamp;
                    try {
                        jsonRes.Value = JSON.parse(
                            res.value.value.toString('utf8')
                        );
                    } catch (err) {
                        console.log(err);
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(
                            res.value.value.toString('utf8')
                        );
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                allResults.push(jsonRes);
            }
            res = await iterator.next();
        }
        await iterator.close();
        return allResults;
    }

    /**
     * Gets state by key
     * @param ctx The transaction context
     * @param key The key
     * @returns The state data
     */
    async GetStateByKey(ctx: Context, key: string): Promise<unknown> {
        const dataBytes = await ctx.stub.getState(key);
        if (!dataBytes || dataBytes.length === 0) {
            throw new Error(`State not found for key: ${key}`);
        }

        try {
            return JSON.parse(dataBytes.toString());
        } catch (error) {
            console.error('Failed to parse state data:', error);
            throw new Error('Invalid state data format');
        }
    }
}

export { CoconikoCoinContract, orgMSPID }; 