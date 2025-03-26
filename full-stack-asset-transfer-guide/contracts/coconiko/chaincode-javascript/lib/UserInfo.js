'use strict';

const {ContractEvent} = require('./ConstractEvent.js');

class UserInfo extends ContractEvent{
    static docType() {
        return 'user-info';
    }

    constructor(userId, accountId, role, balance=0, active=true) {
        super(UserInfo.docType());
        this.docType = UserInfo.docType();
        this.userId = userId;
        this.role = role;
        this.accountId = accountId;
        this.balance = balance;
        this.active = active;
        this.nfts = [];
        this.created = new Date().toISOString();
        this.updated = this.created;
    }

    static fromJSON(json) {
        if(json.docType !== UserInfo.docType()) {
            throw new Error(`docType must be ${UserInfo.docType()}`);
        }
        const obj = new UserInfo();
        Object.assign(obj, {
            docType: json.docType,
            userId: json.userId,
            accountId: json.accountId,
            role: json.role,
            balance: json.balance,
            active: typeof json.active === 'boolean' ? json.active : json.active === 'true',
            nfts: json.nfts?json.nfts:[],
            created: json.created,
            updated: json.updated
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            userId: this.userId,
            accountId: this.accountId,
            role: this.role,
            balance: this.balance,
            active: this.active,
            nfts: this.nfts,
            created: this.created,
            updated: this.updated
        };
    }

    static createKey(ctx, accountId) {
        return (ctx.stub.createCompositeKey(UserInfo.docType(), [accountId]));
    }

    getKey(ctx) {
        return UserInfo.createKey(ctx, this.accountId);
    }

    static fromBuffer(buffer) {
        return UserInfo.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    async putState(ctx) {
        const ret = await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
        return ret;
    }

    addNFT(nftId) {
        this.nfts.push(nftId);
    }

    removeNFT(nftId) {
        this.nfts = this.nfts.filter(id => id !== nftId);
    }

    static async fromState(ctx, accountId) {
        const key = UserInfo.createKey(ctx, accountId);
        const userInfoBufBytes = await ctx.stub.getState(key);
        if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
            throw new Error('user info not found');
        }
        return UserInfo.fromBuffer(userInfoBufBytes);
    }

    static async createUserAccount(ctx) {
        const userInfo = new UserInfo(
            ctx.clientIdentity.getAttributeValue('username'),
            ctx.clientIdentity.getID(),
            ctx.clientIdentity.getAttributeValue('role'));
        await userInfo.putState(ctx);
        return userInfo;
    }

    static async getOrCreateCurrentUserAccount(ctx) {
        const accountId = ctx.clientIdentity.getID();
        const key = UserInfo.createKey(ctx, accountId);
        let userInfo;
        const userInfoBufBytes = await ctx.stub.getState(key);
        if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
            userInfo = UserInfo.createUserAccount(ctx);
        } else {
            userInfo = UserInfo.fromBuffer(userInfoBufBytes);
        }
        return userInfo;
    }
}

module.exports = { UserInfo };