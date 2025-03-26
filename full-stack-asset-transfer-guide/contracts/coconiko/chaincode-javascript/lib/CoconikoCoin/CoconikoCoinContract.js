'use strict';

const { Contract } = require('fabric-contract-api');
const { CoconikoCoin } = require('./CoconikoCoin.js');
const { SystemInfo } = require('../SystemInfo.js');
const { UserInfo } = require('../UserInfo.js');
const { CoinTransferEvent } = require('./CoinTransferEvent.js');
const { ContractEvent } = require('../ConstractEvent.js');

// Define org MSPID

const orgMSPID = 'sdlMSP';

// Define objectType names for prefix
// const balancePrefix = 'coconikoCoinBalance';
// const eventHistoryPrefix = 'coconikoCoinEvent';
const SystemId = '0x0';

class CoconikoCoinContract extends Contract {

    constructor() {
        super('CoconikoCoinContract');
    }

    async TokenName(ctx) {
        return 'coconiko-coin';
    }

    async TotalSupply(ctx, startDate, endDate) {
        const selector = {
            docType: CoinTransferEvent.docType()
        };
        const timestamp = {};
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
        let summary = {
            totalSupply: 0,
            totalActiveSupply: 0
        };
        let bookmark;

        while(!done) {
            const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
            if (metadata.fetchedRecordsCount === 0){
                done = true;
                continue;
            }
            bookmark = metadata.bookmark;
            let res = await iterator.next();
            while (!res.done) {
                if (res.value && res.value.value.toString()) {
                    const cv = CoinTransferEvent.fromBuffer(res.value.value);
                    if (cv.from === SystemId) {
                        const toUserInfo = await UserInfo.fromState(ctx, cv.to);
                        if (toUserInfo.active) {
                            summary.totalActiveSupply += cv.amount;
                        }
                        summary.totalSupply += cv.amount;
                    }
                    res = await iterator.next();
                }
            }
            iterator.close();
        }

        return summary;
    }

    async Initialize(ctx) {
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('client is not authorized to set the name and symbol of the token');
        }

        const systemInfoBytes = await ctx.stub.getState(SystemInfo.getKey());
        if (!systemInfoBytes || systemInfoBytes.length === 0) {
            const systemInfo = new SystemInfo();
            await systemInfo.putState(ctx);
        } else {
            console.log('contract are already initialized');
        }
    }

    async CreateUserAccount(ctx) {
        ContractEvent.initEvents();
        const userInfo = await UserInfo.createUserAccount(ctx);
        ContractEvent.commitEvents(ctx);
        return userInfo.toJSON();
    }

    async ClientAccountInfo(ctx) {
        const userInfo = await UserInfo.fromState(ctx, ctx.clientIdentity.getID());
        return userInfo.toJSON();
    }

    async ActiveUser(ctx, active) {
        ContractEvent.initEvents();
        const userInfo = await UserInfo.getOrCreateCurrentUserAccount(ctx);
        const activeBool = active === 'true';
        if (userInfo.active !== activeBool) {
            userInfo.active = activeBool;
            await userInfo.putState(ctx);
        }
        ContractEvent.commitEvents(ctx);
        return userInfo.toJSON();
    }

    /**
     *
     * @param {Context} ctx the transaction context
     * @param {Integer} amount 数量
     * @param {Integer} days 有効期限（日数）
     */
    async Mint(ctx, amount, days) {
        ContractEvent.initEvents();
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('client is not authorized to mint new tokens');
        }

        const minter = ctx.clientIdentity.getID();

        const amountInt = parseInt(amount);
        if (amountInt <= 0) {
            throw new Error('mint amount must be a positive integer');
        }

        // 有効期限がある場合、coinを作成してFabricNetworkに追加
        const daysInt = parseInt(days) || 0;
        if (daysInt < 0) {
            throw new Error('days must >= 0 and must be a positive integer');
        }

        const coin = new CoconikoCoin(amountInt, daysInt, minter);
        const coinKey = coin.getKey(ctx);
        const oldLocalcoinBytes = await ctx.stub.getState(coinKey);
        if (oldLocalcoinBytes && oldLocalcoinBytes.length !== 0) {
            const oldLocalcoin = CoconikoCoin.fromBuffer(oldLocalcoinBytes);
            oldLocalcoin.amount += coin.amount;
            await oldLocalcoin.putState(ctx);
        } else {
            await coin.putState(ctx);
        }

        // Increase minter balance
        const userInfo = await UserInfo.fromState(ctx, minter);
        userInfo.balance += coin.amount;
        await userInfo.putState(ctx);

        // Increase totalSupply
        const systemInfo = await SystemInfo.fromState(ctx);
        systemInfo.totalSupply += coin.amount;
        await systemInfo.putState(ctx);

        // Emit the Transfer event
        const from = SystemId;
        const to = minter;
        const transferEvent = new CoinTransferEvent(from, to, coin.amount, coin.expirationDate);
        await transferEvent.putState(ctx);
        // Commit event
        ContractEvent.commitEvents(ctx);
        return coin.toJSON();
    }

    async BalanceOf(ctx, owner) {
        const ownerInfo = await UserInfo.fromState(ctx, owner);
        return ownerInfo.balance;
    }

    // QueryAssetsWithPagination uses a query string, page size and a bookmark to perform a query
    // for assets. Query string matching state database syntax is passed in and executed as is.
    // The number of fetched records would be equal to or lesser than the specified page size.
    // Supports ad hoc queries that can be defined at runtime by the client.
    // If this is not desired, follow the QueryAssetsForOwner example for parameterized queries.
    // Only available on state databases that support rich query (e.g. CouchDB)
    // Paginated queries are only valid for read only transactions.
    async queryAssetsWithPagination(ctx, queryString, pageSize, bookmark) {

        const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
        console.log(metadata);

        const results = await this._getAllResults(iterator, false);

        const ResponseMetadata = {
            RecordsCount: metadata.fetchedRecordsCount,
            Bookmark: metadata.bookmark,
        };

        const returnData = { results: results, metadata: ResponseMetadata };

        return JSON.stringify(returnData);
    }

    /**
     * ユーザー指定利用期限のコインを回収する
     * @param {Contract} ctx
     * @param {string} owner
     * @param {string} expirationDate
     * @returns
     */
    async BurnExpired(ctx, owner, expirationDate) {
        ContractEvent.initEvents();

        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error('client is not authorized to burn localcoins');
        }

        const coin = await CoconikoCoin.fromState(ctx, owner, expirationDate);
        if (coin.burned) {
            return 'coin already burned';
        }

        coin.burned = true;
        await coin.putState(ctx);

        // Decrease owner balance
        const userInfo = await UserInfo.fromState(ctx, owner);
        if(userInfo.balance < coin.amount) {
            throw new Error('Out of user balance, please contact adminstrator.');
        }
        userInfo.balance -= coin.amount;
        await userInfo.putState(ctx);

        const systemInfo = await SystemInfo.fromState(ctx);
        if(systemInfo.totalSupply < coin.amount) {
            throw new Error('Out of system balance, please contact adminstrator.');
        }
        systemInfo.totalSupply -= coin.amount;
        await systemInfo.putState(ctx);

        // Emit the Transfer event
        const from = owner;
        const to = SystemId;
        const transferEvent = new CoinTransferEvent(from, to, coin.amount, coin.expirationDate);
        await transferEvent.putState(ctx);

        // 添加事件提交
        ContractEvent.commitEvents(ctx);
        return coin.toJSON();
    }

    async Summary(ctx, startDate, endDate) {
        const selector = {
            docType: CoinTransferEvent.docType()
        };
        const timestamp = {};
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
        let summary = {
            totalMinted: 0,
            totalUsed: 0
        };
        let bookmark;

        while(!done) {
            const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
            if (metadata.fetchedRecordsCount === 0){
                done = true;
                continue;
            }
            bookmark = metadata.bookmark;
            let res = await iterator.next();
            while (!res.done) {
                console.debug(res.value.key);
                if (res.value && res.value.value.toString()) {
                    const cv = CoinTransferEvent.fromBuffer(res.value.value);
                    if (cv.from === SystemId) {
                        const toUserInfo = await UserInfo.fromState(ctx, cv.to);
                        if (toUserInfo.active) {
                            summary.totalMinted += cv.amount;
                        }
                    }
                    if (cv.from !== SystemId) {
                        const fromUserInfo = await UserInfo.fromState(ctx, cv.from);
                        if (fromUserInfo.active) {
                            summary.totalUsed += cv.amount;
                        }
                    }
                    res = await iterator.next();
                }
            }
            iterator.close();
        }

        return summary;
    }

    async Transfer(ctx, to, amount) {
        const from = ctx.clientIdentity.getID();
        return this.TransferFrom(ctx, from, to, amount);
    }

    async TransferFrom(ctx, from, to, amount) {
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
            throw new Error('transfer amount must be a positive integer');
        }

        const fromUserInfo = await UserInfo.fromState(ctx, from);
        if(fromUserInfo.balance < amountInt) {
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
        iterator.close();

        const toUserInfo = await UserInfo.fromState(ctx, to);
        toUserInfo.balance += amountInt;
        fromUserInfo.balance -= amountInt;
        await toUserInfo.putState(ctx);
        await fromUserInfo.putState(ctx);

        // Emit the Transfer event
        const transferEvent = new CoinTransferEvent(from, to, amountInt);
        await transferEvent.putState(ctx);

        // 添加事件提交
        ContractEvent.commitEvents(ctx);
        return transferEvent.toJSON();
    }

    // transfer coin from fromLocalcoin to other user 'to', remainAmount is left amount
    async _transfer_coin(ctx, fromLocalcoin, to, remainAmount) {

        const toLocalcoinKey = CoconikoCoin.createKey(ctx, to, fromLocalcoin.expirationDate);

        if (remainAmount >= fromLocalcoin.amount) {
            let toLocalcoin;
            const oldToLocalcoinBytes = await ctx.stub.getState(toLocalcoinKey);
            if (oldToLocalcoinBytes && oldToLocalcoinBytes.length !== 0) {
                const oldToLocalcoin = CoconikoCoin.fromBuffer(oldToLocalcoinBytes);
                toLocalcoin = oldToLocalcoin;
                toLocalcoin.amount += fromLocalcoin.amount;
            } else {
                // toLocalcoin = new CoconikoCoin(fromLocalcoin.amount, fromLocalcoin.expirationDate, to);
                toLocalcoin = CoconikoCoin.fromJSON(fromLocalcoin.toJSON());
                toLocalcoin.owner = to;
                toLocalcoin.amount = fromLocalcoin.amount;
            }
            console.debug('fromLocalcoin', fromLocalcoin);
            console.debug('toLocalcoin', toLocalcoin);
            await fromLocalcoin.removeState(ctx);
            await toLocalcoin.putState(ctx);
            remainAmount -= fromLocalcoin.amount;
        } else {
            let toLocalcoin;
            const oldToLocalcoinBytes = await ctx.stub.getState(toLocalcoinKey);
            if (oldToLocalcoinBytes && oldToLocalcoinBytes.length !== 0) {
                const oldToLocalcoin = CoconikoCoin.fromBuffer(oldToLocalcoinBytes);
                toLocalcoin = oldToLocalcoin;
                toLocalcoin.amount += remainAmount;
            } else {
                toLocalcoin = CoconikoCoin.fromJSON(fromLocalcoin.toJSON());
                toLocalcoin.owner = to;
                toLocalcoin.amount = remainAmount;
            }
            fromLocalcoin.amount -= remainAmount;
            console.debug('fromLocalcoin', fromLocalcoin);
            console.debug('toLocalcoin', toLocalcoin);
            await fromLocalcoin.putState(ctx);
            await toLocalcoin.putState(ctx);

            remainAmount = 0;
        }

        return remainAmount;
    }

    // Iterates over a result set and builds an array of objects with key value pairs
    // for each record in the result set
    async _getAllResults(iterator, isHistory) {
        let allResults = [];
        let res = await iterator.next();
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
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
        iterator.close();
        return allResults;
    }

    async GetStateByKey(ctx, key) {
        const dataBytes = await ctx.stub.getState(key);
        if (!dataBytes || dataBytes.length === 0) {
            throw new Error(`State not found for key: ${key}`);
        }

        try {
            return JSON.parse(dataBytes.toString('utf8'));
        } catch (error) {
            console.error('Failed to parse state data:', error);
            throw new Error('Invalid state data format');
        }
    }
}

module.exports = { CoconikoCoinContract, orgMSPID };