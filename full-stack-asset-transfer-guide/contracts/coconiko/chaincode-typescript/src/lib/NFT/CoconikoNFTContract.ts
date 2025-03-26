import { Context, Contract } from 'fabric-contract-api';
import { UserInfo } from '../UserInfo';
import { CoconikoNFT } from './CoconikoNFT';
import { ContractEvent } from '../ContractEvent';
import { NFTTransferEvent } from './NFTTransferEvent';
import { NFTMetadata } from '../../types';

/**
 * Contract for managing Coconiko NFTs
 */
class CoconikoNFTContract extends Contract {

    /**
     * Creates a new CoconikoNFTContract instance
     */
    constructor() {
        super('CoconikoNFTContract');
    }

    /**
     * Initializes the contract
     * @param ctx The transaction context
     */
    async Initialize(ctx: Context): Promise<void> {
        // Initialization logic if needed
    }

    /**
     * Mints a new NFT with specified metadata and assigns ownership
     * @param ctx The transaction context
     * @param metadataJson JSON string containing NFT metadata (name, description, image)
     * @returns Minted NFT details in JSON format
     * @description Creates NFT record, updates recipient's NFT list, and emits creation event
     */
    async MintNFT(ctx: Context, metadataJson: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const owner = ctx.clientIdentity.getID();
        const metadata = JSON.parse(metadataJson) as NFTMetadata;

        const nft = new CoconikoNFT(owner, metadata);
        await nft.putState(ctx);

        const userInfo = await UserInfo.fromState(ctx, owner);
        userInfo.addNFT(nft.data.id);
        await userInfo.putState(ctx);

        await ContractEvent.commitEvents(ctx);
        return nft.toJSON();
    }

    /**
     * Gets an NFT by ID
     * @param ctx The transaction context
     * @param id NFT ID
     * @returns NFT details in JSON format
     */
    async GetNFT(ctx: Context, id: string): Promise<Record<string, unknown>> {
        const nft = await CoconikoNFT.fromState(ctx, id);
        return nft.toJSON();
    }

    /**
     * Transfers an NFT from one owner to another
     * @param ctx The transaction context
     * @param from The current owner's ID
     * @param to The recipient's ID
     * @param nftId The ID of the NFT to transfer
     * @returns The updated NFT object
     */
    async TransferNFT(ctx: Context, from: string, to: string, nftId: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const userAccountId = ctx.clientIdentity.getID();
        const userRole = ctx.clientIdentity.getAttributeValue('role');

        if (from === '') {
            from = userAccountId;
        }

        const nft = await CoconikoNFT.fromState(ctx, nftId);

        if (nft.data.owner !== from && userRole !== 'admin') {
            throw new Error('Caller does not own this NFT');
        }

        nft.data.owner = to;
        nft.data.lastUpdated = new Date().toISOString();
        await nft.putState(ctx);

        const fromUser = await UserInfo.fromState(ctx, from);
        fromUser.removeNFT(nftId);
        await fromUser.putState(ctx);

        const toUser = await UserInfo.fromState(ctx, to);
        toUser.addNFT(nftId);
        await toUser.putState(ctx);

        // Emit the Transfer event
        const nftTransferEvent = new NFTTransferEvent(from, to, nftId);
        await nftTransferEvent.putState(ctx);

        await ContractEvent.commitEvents(ctx);
        return nft.toJSON();
    }
}

export { CoconikoNFTContract }; 