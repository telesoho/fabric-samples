import { ContractEvent } from './ConstractEvent';
import { Context } from 'fabric-contract-api';


// 定义JSON序列化接口
interface UserInfoJSON {
  docType: string;
  userId: string;
  accountId: string;
  role: string;
  balance: number;
  active: boolean;
  nfts: string[];
  created: string;
  updated: string;
}

class UserInfo extends ContractEvent {
  docType: string;
  userId: string;
  accountId: string;
  role: string;
  balance: number;
  active: boolean;
  nfts: string[];
  created: string;
  updated: string;

  static docType(): string {
    return 'user-info';
  }

  constructor(
    userId?: string,
    accountId?: string,
    role?: string,
    balance: number = 0,
    active: boolean = true
  ) {
    super(UserInfo.docType());
    this.docType = UserInfo.docType();
    this.userId = userId ?? '';
    this.accountId = accountId ?? '';
    this.role = role ?? '';
    this.balance = balance;
    this.active = active;
    this.nfts = [];
    const now = new Date().toISOString();
    this.created = now;
    this.updated = now;
  }

  static fromJSON(json: Partial<UserInfoJSON>): UserInfo {
    if (json.docType !== UserInfo.docType()) {
      throw new Error(`docType must be ${UserInfo.docType()}`);
    }

    const obj = new UserInfo();
    Object.assign(obj, {
      docType: json.docType,
      userId: json.userId ?? '',
      accountId: json.accountId ?? '',
      role: json.role ?? '',
      balance: Number(json.balance ?? 0),
      active: typeof json.active === 'boolean' 
        ? json.active 
        : json.active === 'true',
      nfts: json.nfts ? [...json.nfts] : [],
      created: json.created ?? new Date().toISOString(),
      updated: json.updated ?? new Date().toISOString()
    });
    return obj;
  }

  toJSON(): UserInfoJSON {
    return {
      docType: this.docType,
      userId: this.userId,
      accountId: this.accountId,
      role: this.role,
      balance: this.balance,
      active: this.active,
      nfts: [...this.nfts],
      created: this.created,
      updated: this.updated
    };
  }

  static createKey(ctx: Context, accountId: string): string {
    return ctx.stub.createCompositeKey(UserInfo.docType(), [accountId]);
  }

  getKey(ctx: Context): string {
    return UserInfo.createKey(ctx, this.accountId);
  }

  static fromBuffer(buffer: Uint8Array): UserInfo {
    return UserInfo.fromJSON(JSON.parse(buffer.toString()));
  }

  toBuffer(): Buffer {
    return Buffer.from(JSON.stringify(this.toJSON()));
  }

  async putState(ctx: Context): Promise<void> {
    await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    ContractEvent.addEvent(this, ctx);
  }

  addNFT(nftId: string): void {
    if (!this.nfts.includes(nftId)) {
      this.nfts.push(nftId);
      this.updated = new Date().toISOString();
    }
  }

  removeNFT(nftId: string): void {
    const initialLength = this.nfts.length;
    this.nfts = this.nfts.filter(id => id !== nftId);
    if (this.nfts.length !== initialLength) {
      this.updated = new Date().toISOString();
    }
  }

  static async fromState(ctx: Context, accountId: string): Promise<UserInfo> {
    const key = UserInfo.createKey(ctx, accountId);
    const userInfoBufBytes = await ctx.stub.getState(key);
    
    if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
      throw new Error('User info not found');
    }
    
    return UserInfo.fromBuffer(userInfoBufBytes);
  }

  static async createUserAccount(ctx: Context): Promise<UserInfo> {
    const userInfo = new UserInfo(
      ctx.clientIdentity.getAttributeValue('username')??"",
      ctx.clientIdentity.getID(),
      ctx.clientIdentity.getAttributeValue('role')??""
    );
    
    await userInfo.putState(ctx);
    return userInfo;
  }

  static async getOrCreateCurrentUserAccount(ctx: Context): Promise<UserInfo> {
    const accountId = ctx.clientIdentity.getID();
    const key = UserInfo.createKey(ctx, accountId);
    const userInfoBufBytes = await ctx.stub.getState(key);

    if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
      return await UserInfo.createUserAccount(ctx);
    }
    
    return UserInfo.fromBuffer(userInfoBufBytes);
  }
}

export { UserInfo, type UserInfoJSON };