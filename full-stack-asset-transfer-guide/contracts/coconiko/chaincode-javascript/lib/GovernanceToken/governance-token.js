'use strict';

const { uid } = require('../Utils.js');

class GovernanceToken {
    static docType() {
        return 'coconiko-governance-token';
    }

    constructor(owner, tokenType) {
        this.docType = GovernanceToken.docType();
        this.tokenId = `gtoken_${uid()}`;
        this.owner = owner;
        this.tokenType = tokenType;
    }

    static fromJSON(json) {
        if(json.docType !== GovernanceToken.docType()) {
            throw new Error(`docType must be ${GovernanceToken.docType()}`);
        }
        const obj = new GovernanceToken();
        Object.assign(obj, {
            tokenId: json.tokenId,
            owner: json.owner,
            tokenType: json.tokenType
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            tokenId: this.tokenId,
            owner: this.owner,
            tokenType: this.tokenType
        };
    }

    static fromBuffer(buffer) {
        return GovernanceToken.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx, tokenId) {
        return ctx.stub.createCompositeKey(GovernanceToken.docType(), [tokenId]);
    }

    getKey(ctx) {
        return GovernanceToken.createKey(ctx, this.tokenId);
    }

    async removeState(ctx) {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx) {
        return await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx, tokenId) {
        const key = GovernanceToken.createKey(tokenId);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('GovernanceToken not found');
        }
        return GovernanceToken.fromBuffer(bufBytes);
    }
}

module.exports = { GovernanceToken };