import { Context } from 'fabric-contract-api';
import { ContractEvent } from '../ContractEvent';
import { NFTTransferEventJSON } from '../../types';

/**
 * Represents an NFT transfer event
 */
class NFTTransferEvent extends ContractEvent {
    data: NFTTransferEventJSON;

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'nft-transfer-event';
    }

    /**
     * Creates a new NFTTransferEvent instance
     * @param from Source account ID
     * @param to Destination account ID
     * @param nftId NFT ID
     */
    constructor(from: string, to: string, nftId: string) {
        super(NFTTransferEvent.docType());
        
        this.data = {
            docType: NFTTransferEvent.docType(),
            from,
            to,
            nftId,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Creates an NFTTransferEvent instance from JSON data
     * @param json JSON data
     * @returns A new NFTTransferEvent instance
     */
    static fromJSON(json: Partial<NFTTransferEventJSON>): NFTTransferEvent {
        if (json.docType !== NFTTransferEvent.docType()) {
            throw new Error(`docType must be ${NFTTransferEvent.docType()}`);
        }
        
        const event = new NFTTransferEvent(
            json.from ?? '',
            json.to ?? '',
            json.nftId ?? ''
        );
        
        if (json.timestamp) {
            event.data.timestamp = json.timestamp;
        }
        
        return event;
    }

    /**
     * Converts the NFTTransferEvent instance to JSON
     * @returns JSON representation of the NFTTransferEvent instance
     */
    toJSON(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Creates a composite key for an NFT transfer event
     * @param ctx The transaction context
     * @param timestamp Timestamp
     * @param nftId NFT ID
     * @param from Source account ID
     * @param to Destination account ID
     * @returns The composite key
     */
    static createKey(ctx: Context, timestamp: string, nftId: string, from: string, to: string): string {
        return ctx.stub.createCompositeKey(NFTTransferEvent.docType(), [timestamp, nftId, from, to]);
    }

    /**
     * Gets the key for this NFTTransferEvent instance
     * @param ctx The transaction context
     * @returns The key
     */
    getKey(ctx: Context): string {
        return NFTTransferEvent.createKey(ctx, this.data.timestamp, this.data.nftId, this.data.from, this.data.to);
    }

    /**
     * Creates an NFTTransferEvent instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new NFTTransferEvent instance
     */
    static fromBuffer(buffer: Uint8Array): NFTTransferEvent {
        return NFTTransferEvent.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the NFTTransferEvent instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Writes the NFTTransferEvent instance to the ledger
     * @param ctx The transaction context
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
    }
}

export { NFTTransferEvent }; 