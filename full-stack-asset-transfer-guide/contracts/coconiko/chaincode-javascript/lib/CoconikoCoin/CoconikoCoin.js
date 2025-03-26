'use strict';

Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
    return this;
};

class CoconikoCoin {

    static docType() {
        return 'coconiko-coin';
    }

    constructor(amount, days, owner) {
        if (days < 0) {
            throw new Error('days must >= 0');
        }
        let expirationDate;
        if (days > 0) {
            expirationDate = new Date().addDays(days).toISOString().substring(0, 10);
            // expirationDate = new Date().addDays(days).toLocaleString('ja', {timeZone: 'Asia/Tokyo'}).substring(0, 10);
        }
        this.docType = CoconikoCoin.docType();
        this.amount = amount;
        this.expirationDate = expirationDate;
        this.owner = owner;
        this.burned = false;
    }

    static fromJSON(json) {
        if(json.docType !== CoconikoCoin.docType()) {
            throw new Error(`docType must be ${CoconikoCoin.docType()}`);
        }
        const obj = new CoconikoCoin();
        Object.assign(obj, {
            docType: json.docType,
            amount: json.amount,
            expirationDate: json.expirationDate,
            owner: json.owner,
            burned: json.burned
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            amount: this.amount,
            expirationDate: this.expirationDate,
            owner: this.owner,
            burned: this.burned
        };
    }

    static fromBuffer(buffer) {
        return CoconikoCoin.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx, owner, expirationDate) {
        return (expirationDate
            ?ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner, expirationDate])
            :ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner]));
    }

    getKey(ctx) {
        return CoconikoCoin.createKey(ctx, this.owner, this.expirationDate);
    }

    async removeState(ctx) {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx) {
        return await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx, accountId, expirationDate) {
        const key = expirationDate
            ?ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId, expirationDate])
            :ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId]);
        const coinBufBytes = await ctx.stub.getState(key);
        if (!coinBufBytes || coinBufBytes.length === 0) {
            throw new Error('coin not found');
        }
        return CoconikoCoin.fromBuffer(coinBufBytes);
    }

}

module.exports = {CoconikoCoin};