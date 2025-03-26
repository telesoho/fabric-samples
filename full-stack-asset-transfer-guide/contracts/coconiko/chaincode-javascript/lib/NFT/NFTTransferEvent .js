'use strict';

const {ContractEvent} = require('../ConstractEvent.js');

class NFTTransferEvent extends ContractEvent {

    static docType() {
        return 'nft-transfer-event';
    }

    constructor(from, to, nftId) {
        super(NFTTransferEvent.docType());
        this.docType = NFTTransferEvent.docType();
        this.from = from;
        this.to = to;
        this.nftId = nftId;
        this.timestamp = new Date().toISOString();
    }

    static fromJSON(json) {
        if(json.docType !== NFTTransferEvent.docType()) {
            throw new Error(`docType must be ${NFTTransferEvent.docType()}`);
        }
        const obj = new NFTTransferEvent();
        Object.assign(obj, {
            docType: json.docType,
            from: json.from,
            to: json.to,
            nftId: json.nftId,
            timestamp: json.timestamp
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            from: this.from,
            to: this.to,
            nftId: this.nftId,
            timestamp: this.timestamp
        };
    }

    static createKey(ctx, timestamp, nftId, from, to) {
        return (ctx.stub.createCompositeKey(NFTTransferEvent.docType(), [timestamp, nftId, from, to]));
    }

    getKey(ctx) {
        return NFTTransferEvent.createKey(ctx, this.timestamp, this.nftId, this.from, this.to);
    }

    static fromBuffer(buffer) {
        return NFTTransferEvent.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    async putState(ctx) {
        const ret = await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
        return ret;
    }
}

module.exports = { NFTTransferEvent };