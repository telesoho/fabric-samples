'use strict';

const {ContractEvent} = require('../ConstractEvent.js');

class CoinTransferEvent extends ContractEvent {

    static docType() {
        return 'coin-transfer-event';
    }

    constructor(from, to, amount, expirationDate=null) {
        super(CoinTransferEvent.docType());
        this.docType = CoinTransferEvent.docType();
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.expirationDate = expirationDate;
        this.timestamp = new Date().toISOString();
    }

    static fromJSON(json) {
        if(json.docType !== CoinTransferEvent.docType()) {
            throw new Error(`docType must be ${CoinTransferEvent.docType()}`);
        }
        const obj = new CoinTransferEvent();
        Object.assign(obj, {
            docType: json.docType,
            from: json.from,
            to: json.to,
            amount: json.amount,
            expirationDate: json.expirationDate,
            timestamp: json.timestamp
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            from: this.from,
            to: this.to,
            amount: this.amount,
            expirationDate: this.expirationDate,
            timestamp: this.timestamp
        };
    }

    static createKey(ctx, timestamp, from, to) {
        return (ctx.stub.createCompositeKey(CoinTransferEvent.docType(), [timestamp, from, to]));
    }

    getKey(ctx) {
        return CoinTransferEvent.createKey(ctx, this.timestamp, this.from, this.to);
    }

    static fromBuffer(buffer) {
        return CoinTransferEvent.fromJSON(JSON.parse(buffer.toString()));
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

module.exports = { CoinTransferEvent };