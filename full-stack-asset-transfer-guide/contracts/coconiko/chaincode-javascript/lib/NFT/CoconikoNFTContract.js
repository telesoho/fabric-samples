'use strict';

const { Contract } = require('fabric-contract-api');
const { UserInfo } = require('../UserInfo.js');
const { CoconikoNFT } = require('./CoconikoNFT.js');
const { ContractEvent } = require('../ConstractEvent.js');
const { NFTTransferEvent } = require('./NFTTransferEvent .js');

class CoconikoNFTContract extends Contract {

    constructor() {
        super('CoconikoNFTContract');
    }

    async Initialize(ctx) {
        // const baseContract = new CoconikoNFTContract();
    }

    /**
     * Mints a new NFT with specified metadata and assigns ownership
     * @param {Contract} ctx The transaction context
     * @param {string} metadataJson JSON string containing NFT metadata (name, description, image)
     * @returns {Object} Minted NFT details in JSON format
     * @description Creates NFT record, updates recipient's NFT list, and emits creation event
     */
    async MintNFT(ctx, metadataJson) {
        ContractEvent.initEvents();

        const owner = ctx.clientIdentity.getID();

        const metadata = JSON.parse(metadataJson);

        const nft = new CoconikoNFT(owner, metadata);
        await nft.putState(ctx);

        const userInfo = await UserInfo.fromState(ctx, owner);
        userInfo.addNFT(nft.id);
        await userInfo.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return nft.toJSON();
    }

    async GetNFT(ctx, id) {
        const nft = await CoconikoNFT.fromState(ctx, id);
        return nft.toJSON();
    }

    /**
     * Transfer an NFT from one owner to another
     * @param {Contract} ctx The transaction context
     * @param {string} from The current owner's ID
     * @param {string} to The recipient's ID
     * @param {string} nftId The ID of the NFT to transfer
     * @returns {Object} The updated NFT object
     */
    async TransferNFT(ctx, from, to, nftId) {
        ContractEvent.initEvents();

        const userAccountId = ctx.clientIdentity.getID();
        const userRole = ctx.clientIdentity.getAttributeValue('role');

        if (from === '') {
            from = userAccountId;
        }

        const nft = await CoconikoNFT.fromState(ctx, nftId);

        if (nft.owner !== from && userRole !== 'admin') {
            throw new Error('Caller does not own this NFT');
        }

        nft.owner = to;
        nft.lastUpdated = new Date().toISOString();
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

        ContractEvent.commitEvents(ctx);
        return nft.toJSON();
    }
}

module.exports = {CoconikoNFTContract};