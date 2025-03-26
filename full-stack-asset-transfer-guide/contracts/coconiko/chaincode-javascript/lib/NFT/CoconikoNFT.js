'use strict';

const {uid} = require('../Utils.js');
const {ContractEvent} = require('../ConstractEvent.js');

class CoconikoNFT extends ContractEvent {

    static docType() {
        return 'coconiko-nft';
    }

    constructor(owner, metadata) {
        super(CoconikoNFT.docType());
        this.docType = CoconikoNFT.docType();
        this.id = `nft_${uid()}`;
        this.owner = owner;
        this.creator = owner;
        this.metadata = metadata;
        this.created = new Date().toISOString();
        this.lastUpdated = this.created;
        this.burned = false;
    }

    static fromJSON(json) {
        if(json.docType !== CoconikoNFT.docType()) {
            throw new Error(`docType must be ${CoconikoNFT.docType()}`);
        }
        const obj = new CoconikoNFT();
        Object.assign(obj, {
            id: json.id,
            owner: json.owner,
            creator: json.creator,
            metadata: json.metadata,
            created: json.created,
            lastUpdated: json.lastUpdated,
            burned: json.burned
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            id: this.id,
            owner: this.owner,
            creator: this.creator,
            metadata: this.metadata,
            created: this.created,
            lastUpdated: this.lastUpdated,
            burned: this.burned
        };
    }

    static fromBuffer(buffer) {
        return CoconikoNFT.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx, id) {
        return ctx.stub.createCompositeKey(CoconikoNFT.docType(), [id]);
    }

    getKey(ctx) {
        return CoconikoNFT.createKey(ctx, this.id);
    }

    async removeState(ctx) {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx) {
        const ret =  await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
        return ret;
    }

    static async fromState(ctx, id) {
        const key = CoconikoNFT.createKey(ctx, id);
        const nftBufBytes = await ctx.stub.getState(key);
        if (!nftBufBytes || nftBufBytes.length === 0) {
            throw new Error(`NFT ${id} not found`);
        }
        return CoconikoNFT.fromBuffer(nftBufBytes);
    }
}

module.exports = {CoconikoNFT};