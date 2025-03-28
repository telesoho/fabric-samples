import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';
const utf8Decoder = new TextDecoder();

export class CoconikoNFT {
    readonly #contract: Contract;

    constructor(contract?: Contract) {
        if (!contract) {
            this.#contract = Connection.coconikoNFTContract;
        } else {
            this.#contract = contract;
        }
    }

    /**
     * Mint a new NFT
     */
    async mintNFT(userId: string, metadata: any): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'MintNFT',
            userId,
            JSON.stringify(metadata)
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Transfer an NFT to another user
     */
    async transferNFT(userId: string, tokenId: string, toAccountId: string, fromAccountId?: string): Promise<any> {
        const args = [
            tokenId,
            toAccountId
        ];
        
        if (fromAccountId) {
            args.unshift(fromAccountId);
        } else {
            args.unshift(userId);
        }
        
        const result = await this.#contract.submitTransaction(
            'TransferNFT',
            ...args
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get NFT information by token ID
     */
    async getNFTInfo(tokenId: string): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetNFTInfo',
            tokenId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get all NFTs owned by a user
     */
    async getUserNFTs(userId: string): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetUserNFTs',
            userId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }
} 