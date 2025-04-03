import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';
const utf8Decoder = new TextDecoder();

export class CoconikoNFT {
    readonly #contract?: Contract;

    constructor(contract?: Contract) {
        this.#contract = contract;
    }

    /**
     * Mint a new NFT
     */
    async mintNFT(metadata: any): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'MintNFT',
            JSON.stringify(metadata)
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Transfer an NFT to another user
     */
    async transferNFT(tokenId: string, toAccountId: string, fromAccountId?: string): Promise<any> {
        const args = [
            fromAccountId || "",
            toAccountId,
            tokenId
        ];
                
        const result = await this.#contract?.submitTransaction(
            'TransferNFT',
            ...args
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get NFT information by token ID
     */
    async getNFTInfo(tokenId: string): Promise<any> {
        const result = await this.#contract?.evaluateTransaction(
            'GetNFT',
            tokenId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get all NFTs owned by a user
     */
    async getUserNFTs(): Promise<any> {
        const result = await this.#contract?.evaluateTransaction(
            'GetUserNFTs'
        );
        return JSON.parse(utf8Decoder.decode(result));
    }
} 