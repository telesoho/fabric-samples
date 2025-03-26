import { Context } from 'fabric-contract-api';
import { uid } from '../Utils';
import { ContractEvent } from '../ContractEvent';
import { CoconikoNFTJSON, NFTMetadata } from '../../types';

/**
 * Represents a Coconiko NFT
 */
class CoconikoNFT extends ContractEvent {
    data: CoconikoNFTJSON;

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'coconiko-nft';
    }

    /**
     * Creates a new CoconikoNFT instance
     * @param owner Owner account ID
     * @param metadata NFT metadata
     */
    constructor(owner?: string, metadata?: NFTMetadata) {
        super(CoconikoNFT.docType());
        
        const now = new Date().toISOString();
        this.data = {
            docType: CoconikoNFT.docType(),
            id: `nft_${uid()}`,
            owner: owner ?? '',
            creator: owner ?? '',
            metadata: metadata ?? { name: '' },
            created: now,
            lastUpdated: now,
            burned: false
        };
    }

    /**
     * Creates a CoconikoNFT instance from JSON data
     * @param json JSON data
     * @returns A new CoconikoNFT instance
     */
    static fromJSON(json: Partial<CoconikoNFTJSON>): CoconikoNFT {
        if (json.docType !== CoconikoNFT.docType()) {
            throw new Error(`docType must be ${CoconikoNFT.docType()}`);
        }
        
        const nft = new CoconikoNFT();
        nft.data = {
            docType: json.docType ?? CoconikoNFT.docType(),
            id: json.id ?? `nft_${uid()}`,
            owner: json.owner ?? '',
            creator: json.creator ?? '',
            metadata: json.metadata ?? { name: '' },
            created: json.created ?? new Date().toISOString(),
            lastUpdated: json.lastUpdated ?? new Date().toISOString(),
            burned: json.burned ?? false
        };
        
        return nft;
    }

    /**
     * Converts the CoconikoNFT instance to JSON
     * @returns JSON representation of the CoconikoNFT instance
     */
    toJSON(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Creates a CoconikoNFT instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new CoconikoNFT instance
     */
    static fromBuffer(buffer: Uint8Array): CoconikoNFT {
        return CoconikoNFT.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the CoconikoNFT instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Creates a composite key for an NFT
     * @param ctx The transaction context
     * @param id NFT ID
     * @returns The composite key
     */
    static createKey(ctx: Context, id: string): string {
        return ctx.stub.createCompositeKey(CoconikoNFT.docType(), [id]);
    }

    /**
     * Gets the key for this CoconikoNFT instance
     * @param ctx The transaction context
     * @returns The key
     */
    getKey(ctx: Context): string {
        return CoconikoNFT.createKey(ctx, this.data.id);
    }

    /**
     * Removes the CoconikoNFT instance from the ledger
     * @param ctx The transaction context
     */
    async removeState(ctx: Context): Promise<void> {
        await ctx.stub.deleteState(this.getKey(ctx));
    }

    /**
     * Writes the CoconikoNFT instance to the ledger
     * @param ctx The transaction context
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
    }

    /**
     * Gets a CoconikoNFT instance from the ledger
     * @param ctx The transaction context
     * @param id NFT ID
     * @returns A CoconikoNFT instance
     */
    static async fromState(ctx: Context, id: string): Promise<CoconikoNFT> {
        const key = CoconikoNFT.createKey(ctx, id);
        const nftBufBytes = await ctx.stub.getState(key);
        
        if (!nftBufBytes || nftBufBytes.length === 0) {
            throw new Error(`NFT ${id} not found`);
        }
        
        return CoconikoNFT.fromBuffer(nftBufBytes);
    }
}

export { CoconikoNFT }; 