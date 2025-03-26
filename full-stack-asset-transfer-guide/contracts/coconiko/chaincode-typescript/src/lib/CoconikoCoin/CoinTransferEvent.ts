import { Context } from 'fabric-contract-api';
import { ContractEvent } from '../ContractEvent';
import { CoinTransferEventJSON } from '../../types';

/**
 * Represents a coin transfer event
 */
class CoinTransferEvent extends ContractEvent {
    data: CoinTransferEventJSON & {
        docType: string;
        timestamp: string;
    };

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'coin-transfer-event';
    }

    /**
     * Creates a new CoinTransferEvent instance
     * @param from Source account ID
     * @param to Destination account ID
     * @param amount Amount to transfer
     * @param expirationDate Optional expiration date
     */
    constructor(from: string, to: string, amount: number, expirationDate: string | null = null) {
        super(CoinTransferEvent.docType());
        
        this.data = {
            docType: CoinTransferEvent.docType(),
            from,
            to,
            amount,
            timestamp: new Date().toISOString()
        };
        
        if (expirationDate) {
            this.data.expirationDate = expirationDate;
        }
    }

    /**
     * Creates a CoinTransferEvent instance from JSON data
     * @param json JSON data
     * @returns A new CoinTransferEvent instance
     */
    static fromJSON(json: Partial<CoinTransferEventJSON> & { timestamp?: string }): CoinTransferEvent {
        if (json.docType !== CoinTransferEvent.docType()) {
            throw new Error(`docType must be ${CoinTransferEvent.docType()}`);
        }
        
        const event = new CoinTransferEvent(
            json.from ?? '',
            json.to ?? '',
            Number(json.amount ?? 0),
            json.expirationDate ?? null
        );
        
        if (json.timestamp) {
            event.data.timestamp = json.timestamp;
        }
        
        return event;
    }

    /**
     * Converts the CoinTransferEvent instance to JSON
     * @returns JSON representation of the CoinTransferEvent instance
     */
    toJSON(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Creates a composite key for a coin transfer event
     * @param ctx The transaction context
     * @param timestamp Timestamp
     * @param from Source account ID
     * @param to Destination account ID
     * @returns The composite key
     */
    static createKey(ctx: Context, timestamp: string, from: string, to: string): string {
        return ctx.stub.createCompositeKey(CoinTransferEvent.docType(), [timestamp, from, to]);
    }

    /**
     * Gets the key for this CoinTransferEvent instance
     * @param ctx The transaction context
     * @returns The key
     */
    getKey(ctx: Context): string {
        return CoinTransferEvent.createKey(ctx, this.data.timestamp, this.data.from, this.data.to);
    }

    /**
     * Creates a CoinTransferEvent instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new CoinTransferEvent instance
     */
    static fromBuffer(buffer: Uint8Array): CoinTransferEvent {
        return CoinTransferEvent.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the CoinTransferEvent instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Writes the CoinTransferEvent instance to the ledger
     * @param ctx The transaction context
     * @returns The result of putState
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
    }
}

export { CoinTransferEvent }; 