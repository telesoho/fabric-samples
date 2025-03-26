import { Context, Contract } from 'fabric-contract-api';
import { CoconikoCoin } from './CoconikoCoin';
import { SystemInfo } from '../SystemInfo';
import { UserInfo } from '../UserInfo';
import { CoinTransferEvent } from './CoinTransferEvent';
import { ContractEvent } from '../ConstractEvent';
import { Iterators } from 'fabric-shim';

// Define org MSPID
const orgMSPID: string = 'sdlMSP';

// Define objectType names for prefix
const SystemId: string = '0x0';

class CoconikoCoinContract extends Contract {
  constructor() {
    super('CoconikoCoinContract');
  }

  async TokenName(ctx: Context): Promise<string> {
    return 'coconiko-coin';
  }

  async TotalSupply(ctx: Context, startDate?: string, endDate?: string): Promise<{
    totalSupply: number;
    totalActiveSupply: number;
  }> {
    const selector: any = {
      docType: CoinTransferEvent.docType()
    };
    const timestamp: any = {};

    if (startDate) timestamp.$gte = startDate;
    if (endDate) timestamp.$lte = endDate;
    if (Object.keys(timestamp).length > 0) selector.timestamp = timestamp;

    const queryString = JSON.stringify({
      selector,
      fields: ['docType', 'from', 'to', 'amount', 'expirationDate', 'timestamp'],
      sort: [{ timestamp: 'asc' }]
    });

    const pageSize = 100;
    let done = false;
    let bookmark: string | undefined;
    const summary = {
      totalSupply: 0,
      totalActiveSupply: 0
    };

    while (!done) {
      const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
      if (metadata.fetchedRecordsCount === 0) {
        done = true;
        continue;
      }

      bookmark = metadata.bookmark;
      let res = await iterator.next();
      while (!res.done) {
        if (res.value.value) {
          const cv = CoinTransferEvent.fromBuffer(res.value.value);
          if (cv.from === SystemId) {
            const toUserInfo = await UserInfo.fromState(ctx, cv.to);
            if (toUserInfo.active) summary.totalActiveSupply += cv.amount;
            summary.totalSupply += cv.amount;
          }
        }
        res = await iterator.next();
      }
      iterator.close();
    }

    return summary;
  }

  async Initialize(ctx: Context): Promise<void> {
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== orgMSPID) throw new Error('client is not authorized to initialize');

    const systemInfoBytes = await ctx.stub.getState(SystemInfo.getKey());
    if (!systemInfoBytes || systemInfoBytes.length === 0) {
      const systemInfo = new SystemInfo();
      await systemInfo.putState(ctx);
    } else {
      console.log('contract already initialized');
    }
  }

  async CreateUserAccount(ctx: Context): Promise<object> {
    ContractEvent.initEvents();
    const userInfo = await UserInfo.createUserAccount(ctx);
    ContractEvent.commitEvents(ctx);
    return userInfo.toJSON();
  }

  async ClientAccountInfo(ctx: Context): Promise<object> {
    const userInfo = await UserInfo.fromState(ctx, ctx.clientIdentity.getID());
    return userInfo.toJSON();
  }

  async ActiveUser(ctx: Context, active: string): Promise<object> {
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

  async Mint(ctx: Context, amount: string, days: string): Promise<object> {
    ContractEvent.initEvents();
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== orgMSPID) throw new Error('Unauthorized mint operation');

    const minter = ctx.clientIdentity.getID();
    const amountInt = parseInt(amount);
    const daysInt = parseInt(days) || 0;

    if (amountInt <= 0) throw new Error('Invalid mint amount');
    if (daysInt < 0) throw new Error('Invalid days value');

    const coin = new CoconikoCoin(amountInt, daysInt, minter);
    const coinKey = coin.getKey(ctx);
    const existingCoin = await ctx.stub.getState(coinKey);

    if (existingCoin.length) {
      const oldCoin = CoconikoCoin.fromBuffer(existingCoin);
      oldCoin.amount += coin.amount;
      await oldCoin.putState(ctx);
    } else {
      await coin.putState(ctx);
    }

    const [userInfo, systemInfo] = await Promise.all([
      UserInfo.fromState(ctx, minter),
      SystemInfo.fromState(ctx)
    ]);

    userInfo.balance += coin.amount;
    systemInfo.totalSupply += coin.amount;

    await Promise.all([
      userInfo.putState(ctx),
      systemInfo.putState(ctx)
    ]);

    const transferEvent = new CoinTransferEvent(SystemId, minter, coin.amount, coin.expirationDate);
    await transferEvent.putState(ctx);
    ContractEvent.commitEvents(ctx);

    return coin.toJSON();
  }

  async BalanceOf(ctx: Context, owner: string): Promise<number> {
    const ownerInfo = await UserInfo.fromState(ctx, owner);
    return ownerInfo.balance;
  }

  async queryAssetsWithPagination(
    ctx: Context,
    queryString: string,
    pageSize: number,
    bookmark?: string
  ): Promise<string> {
    const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
    const results = await this.getAllResults(iterator);
    
    return JSON.stringify({
      results,
      metadata: {
        RecordsCount: metadata.fetchedRecordsCount,
        Bookmark: metadata.bookmark
      }
    });
  }

  async BurnExpired(ctx: Context, owner: string, expirationDate: string): Promise<object> {
    ContractEvent.initEvents();
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== orgMSPID) throw new Error('Unauthorized burn operation');

    const coin = await CoconikoCoin.fromState(ctx, owner, expirationDate);
    if (coin.burned) return { message: 'Coin already burned' };

    coin.burned = true;
    await coin.putState(ctx);

    const [userInfo, systemInfo] = await Promise.all([
      UserInfo.fromState(ctx, owner),
      SystemInfo.fromState(ctx)
    ]);

    if (userInfo.balance < coin.amount) throw new Error('Insufficient user balance');
    if (systemInfo.totalSupply < coin.amount) throw new Error('Insufficient system supply');

    userInfo.balance -= coin.amount;
    systemInfo.totalSupply -= coin.amount;

    await Promise.all([
      userInfo.putState(ctx),
      systemInfo.putState(ctx)
    ]);

    const transferEvent = new CoinTransferEvent(owner, SystemId, coin.amount, coin.expirationDate);
    await transferEvent.putState(ctx);
    ContractEvent.commitEvents(ctx);

    return coin.toJSON();
  }

  async Summary(ctx: Context, startDate?: string, endDate?: string): Promise<{
    totalMinted: number;
    totalUsed: number;
  }> {
    const selector: any = {
      docType: CoinTransferEvent.docType()
    };
    const timestamp: any = {};

    if (startDate) timestamp.$gte = startDate;
    if (endDate) timestamp.$lte = endDate;
    if (Object.keys(timestamp).length > 0) selector.timestamp = timestamp;

    const queryString = JSON.stringify({
      selector,
      fields: ['docType', 'from', 'to', 'amount', 'expirationDate', 'timestamp'],
      sort: [{ timestamp: 'asc' }]
    });

    const pageSize = 100;
    let done = false;
    let bookmark: string | undefined;
    const summary = {
      totalMinted: 0,
      totalUsed: 0
    };

    while (!done) {
      const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(queryString, pageSize, bookmark);
      if (metadata.fetchedRecordsCount === 0) {
        done = true;
        continue;
      }

      bookmark = metadata.bookmark;
      let res = await iterator.next();
      while (!res.done) {
        if (res.value.value) {
          const cv = CoinTransferEvent.fromBuffer(res.value.value);
          if (cv.from === SystemId) {
            const toUserInfo = await UserInfo.fromState(ctx, cv.to);
            if (toUserInfo.active) summary.totalMinted += cv.amount;
          } else {
            const fromUserInfo = await UserInfo.fromState(ctx, cv.from);
            if (fromUserInfo.active) summary.totalUsed += cv.amount;
          }
        }
        res = await iterator.next();
      }
      iterator.close();
    }

    return summary;
  }

  async Transfer(ctx: Context, to: string, amount: string): Promise<object> {
    return this.TransferFrom(ctx, ctx.clientIdentity.getID(), to, amount);
  }

  async TransferFrom(ctx: Context, from: string, to: string, amount: string): Promise<object> {
    ContractEvent.initEvents();
    const operator = ctx.clientIdentity.getID();

    if (operator !== from && !ctx.clientIdentity.assertAttributeValue('role', 'admin')) {
      throw new Error('Unauthorized transfer operation');
    }

    if (from === to) throw new Error('Cannot transfer to self');

    const amountInt = parseInt(amount);
    if (amountInt <= 0) throw new Error('Invalid transfer amount');

    const fromUserInfo = await UserInfo.fromState(ctx, from);
    if (fromUserInfo.balance < amountInt) throw new Error('Insufficient balance');

    const queryString = JSON.stringify({
      selector: {
        docType: CoconikoCoin.docType(),
        owner: from,
        burned: false
      },
      sort: [{ expirationDate: 'asc' }]
    });

    const iterator = await ctx.stub.getQueryResult(queryString);
    let res = await iterator.next();
    let remainAmount = amountInt;

    while (!res.done && remainAmount > 0) {
      if (res.value.value) {
        const coin = CoconikoCoin.fromBuffer(res.value.value);
        remainAmount = await this.transferCoin(ctx, coin, to, remainAmount);
      }
      res = await iterator.next();
    }
    iterator.close();

    const toUserInfo = await UserInfo.fromState(ctx, to);
    toUserInfo.balance += amountInt;
    fromUserInfo.balance -= amountInt;

    await Promise.all([
      toUserInfo.putState(ctx),
      fromUserInfo.putState(ctx)
    ]);

    const transferEvent = new CoinTransferEvent(from, to, amountInt);
    await transferEvent.putState(ctx);
    ContractEvent.commitEvents(ctx);

    return transferEvent.toJSON();
  }

  private async transferCoin(
    ctx: Context,
    fromCoin: CoconikoCoin,
    to: string,
    remainAmount: number
  ): Promise<number> {
    const toCoinKey = CoconikoCoin.createKey(ctx, to, fromCoin.expirationDate);
    const toCoinBytes = await ctx.stub.getState(toCoinKey);

    if (remainAmount >= fromCoin.amount) {
      const toCoin = toCoinBytes.length 
        ? CoconikoCoin.fromBuffer(toCoinBytes) 
        : new CoconikoCoin(0, 0, to);

      toCoin.amount += fromCoin.amount;
      await fromCoin.removeState(ctx);
      await toCoin.putState(ctx);
      remainAmount -= fromCoin.amount;
    } else {
      const toCoin = toCoinBytes.length 
        ? CoconikoCoin.fromBuffer(toCoinBytes) 
        : new CoconikoCoin(0, 0, to);

      toCoin.amount += remainAmount;
      fromCoin.amount -= remainAmount;
      
      await Promise.all([
        fromCoin.putState(ctx),
        toCoin.putState(ctx)
      ]);
      remainAmount = 0;
    }

    return remainAmount;
  }

  private async getAllResults(
    iterator: Iterators.StateQueryIterator
  ): Promise<any[]> {
    const allResults: any[] = [];
    let res = await iterator.next();

    while (!res.done) {
      if (res.value.value) {
        const jsonRes: any = {};
        jsonRes.Key = res.value.key;
        jsonRes.Record = this.safeParse(res.value.value);
        allResults.push(jsonRes);
      }
      res = await iterator.next();
    }

    return allResults;
  }

  private safeParse(buffer: Uint8Array): any {
    try {
      return JSON.parse(buffer.toString());
    } catch (err) {
      console.error('Parse error:', err);
      return buffer.toString();
    }
  }

  async GetStateByKey(ctx: Context, key: string): Promise<any> {
    const dataBytes = await ctx.stub.getState(key);
    if (!dataBytes.length) throw new Error(`State not found for key: ${key}`);
    return this.safeParse(dataBytes);
  }
}

export { CoconikoCoinContract, orgMSPID };