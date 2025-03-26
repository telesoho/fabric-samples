import { Context } from 'fabric-contract-api';

// Extend Date prototype
declare global {
    interface Date {
        addDays(days: number): Date;
    }
}

// Implement the Date.addDays method
Date.prototype.addDays = function(days: number): Date {
    this.setDate(this.getDate() + days);
    return this;
};

/**
 * Interface for CoconikoCoin JSON representation
 */
interface CoconikoCoinJSON {
    docType: string;
    amount: number;
    expirationDate?: string;
    owner: string;
    burned: boolean;
    [key: string]: unknown;
}

/**
 * Represents a coconiko coin
 */
class CoconikoCoin {
    data: CoconikoCoinJSON;

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'coconiko-coin';
    }

    /**
     * Creates a new CoconikoCoin instance
     * @param amount Amount of coins
     * @param days Number of days until expiration
     * @param owner Owner account ID
     */
    constructor(amount?: number, days?: number, owner?: string) {
        this.data = {
            docType: CoconikoCoin.docType(),
            amount: amount ?? 0,
            owner: owner ?? '',
            burned: false
        };

        if (days !== undefined) {
            if (days < 0) {
                throw new Error('days must >= 0');
            }
            if (days > 0) {
                const expirationDate = new Date().addDays(days).toISOString().substring(0, 10);
                this.data.expirationDate = expirationDate;
            }
        }
    }

    /**
     * Creates a CoconikoCoin instance from JSON data
     * @param json JSON data
     * @returns A new CoconikoCoin instance
     */
    static fromJSON(json: Partial<CoconikoCoinJSON>): CoconikoCoin {
        if (json.docType !== CoconikoCoin.docType()) {
            throw new Error(`docType must be ${CoconikoCoin.docType()}`);
        }
        
        const coin = new CoconikoCoin();
        coin.data = {
            docType: json.docType ?? CoconikoCoin.docType(),
            amount: Number(json.amount ?? 0),
            owner: json.owner ?? '',
            burned: Boolean(json.burned ?? false)
        };
        
        if (json.expirationDate) {
            coin.data.expirationDate = json.expirationDate;
        }
        
        return coin;
    }

    /**
     * Converts the CoconikoCoin instance to JSON
     * @returns JSON representation of the CoconikoCoin instance
     */
    toJSON(): CoconikoCoinJSON {
        return this.data;
    }

    /**
     * Creates a CoconikoCoin instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new CoconikoCoin instance
     */
    static fromBuffer(buffer: Uint8Array): CoconikoCoin {
        return CoconikoCoin.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the CoconikoCoin instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Creates a composite key for a coin
     * @param ctx The transaction context
     * @param owner Owner account ID
     * @param expirationDate Optional expiration date
     * @returns The composite key
     */
    static createKey(ctx: Context, owner: string, expirationDate?: string): string {
        return expirationDate
            ? ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner, expirationDate])
            : ctx.stub.createCompositeKey(CoconikoCoin.docType(), [owner]);
    }

    /**
     * Gets the key for this CoconikoCoin instance
     * @param ctx The transaction context
     * @returns The key
     */
    getKey(ctx: Context): string {
        return CoconikoCoin.createKey(ctx, this.data.owner, this.data.expirationDate);
    }

    /**
     * Removes the CoconikoCoin instance from the ledger
     * @param ctx The transaction context
     */
    async removeState(ctx: Context): Promise<void> {
        await ctx.stub.deleteState(this.getKey(ctx));
    }

    /**
     * Writes the CoconikoCoin instance to the ledger
     * @param ctx The transaction context
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    /**
     * Gets a CoconikoCoin instance from the ledger
     * @param ctx The transaction context
     * @param accountId Account ID
     * @param expirationDate Optional expiration date
     * @returns A CoconikoCoin instance
     */
    static async fromState(ctx: Context, accountId: string, expirationDate?: string): Promise<CoconikoCoin> {
        const key = expirationDate
            ? ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId, expirationDate])
            : ctx.stub.createCompositeKey(CoconikoCoin.docType(), [accountId]);
            
        const coinBufBytes = await ctx.stub.getState(key);
        if (!coinBufBytes || coinBufBytes.length === 0) {
            throw new Error('Coin not found');
        }
        
        return CoconikoCoin.fromBuffer(coinBufBytes);
    }
}

export { CoconikoCoin, type CoconikoCoinJSON }; 