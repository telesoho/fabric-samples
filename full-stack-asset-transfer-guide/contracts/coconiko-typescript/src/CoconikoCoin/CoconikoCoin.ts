import { Context } from 'fabric-contract-api';

// 扩展Date原型以添加addDays方法
declare global {
    interface Date {
        addDays(days: number): Date;
    }
}

Date.prototype.addDays = function (days: number): Date {
    this.setDate(this.getDate() + days);
    return this;
};


interface CoconikoCoinJSON {
    docType: string;
    amount: number;
    expirationDate?: string;
    owner: string;
    burned: boolean;
}

class CoconikoCoin {
    docType: string;
    amount: number;
    expirationDate?: string;
    owner: string;
    burned: boolean;

    static docType(): string {
        return 'coconiko-coin';
    }

    constructor(amount?: number, days?: number, owner?: string) {
        if (typeof days === 'number' && days < 0) {
            throw new Error('days must >= 0');
        }

        let expirationDate: string | undefined;
        if (typeof days === 'number' && days > 0) {
            expirationDate = new Date().addDays(days).toISOString().substring(0, 10);
        }

        this.docType = CoconikoCoin.docType();
        this.amount = amount ?? 0;
        this.expirationDate = expirationDate;
        this.owner = owner ?? '';
        this.burned = false;
    }

    static fromJSON(json: CoconikoCoinJSON): CoconikoCoin {
        if (json.docType !== CoconikoCoin.docType()) {
            throw new Error(`docType must be ${CoconikoCoin.docType()}`);
        }

        const obj = new CoconikoCoin();
        obj.docType = json.docType;
        obj.amount = json.amount;
        obj.expirationDate = json.expirationDate;
        obj.owner = json.owner;
        obj.burned = json.burned;
        return obj;
    }

    toJSON(): CoconikoCoinJSON {
        return {
            docType: this.docType,
            amount: this.amount,
            expirationDate: this.expirationDate,
            owner: this.owner,
            burned: this.burned
        };
    }

    static fromBuffer(buffer: ArrayBufferLike): CoconikoCoin {
        return CoconikoCoin.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer(): Buffer {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx: Context, owner: string, expirationDate?: string): string {
        return expirationDate
            ? ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner, expirationDate])
            : ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner]);
    }

    getKey(ctx: Context): string {
        return CoconikoCoin.createKey(ctx, this.owner, this.expirationDate);
    }

    async removeState(ctx: Context): Promise<void> {
        await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx: Context, accountId: string, expirationDate?: string): Promise<CoconikoCoin> {
        const key = expirationDate
            ? ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId, expirationDate])
            : ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId]);
        const coinBufBytes: Uint8Array = await ctx.stub.getState(key);
        if (!coinBufBytes || coinBufBytes.length === 0) {
            throw new Error('Coin not found');
        }
        return CoconikoCoin.fromBuffer(coinBufBytes);
    }
}

export { CoconikoCoin };