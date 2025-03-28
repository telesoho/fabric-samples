import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';

const utf8Decoder = new TextDecoder();

export class GovernanceToken {
    readonly #contract: Contract;

    constructor(contract?: Contract) {
        if (!contract) {
            this.#contract = Connection.governanceTokenContract;
        } else {
            this.#contract = contract;
        }
    }

    /**
     * Create a new voting proposal
     */
    async createProposal(proposalId: string, title: string, description: string, options: string[], endDate: string): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'MintProposal',
            proposalId,
            title,
            description,
            JSON.stringify(options),
            endDate
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Mint a voting NFT for a voter
     */
    async mintVoteNFT(userId: string, proposalId: string, voterId?: string): Promise<any> {
        const args = [proposalId];
        
        if (voterId) {
            args.push(voterId);
        } else {
            args.push(userId);
        }
        
        const result = await this.#contract.submitTransaction(
            'MintVoteNFT',
            ...args
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Cast a vote
     */
    async castVote(proposalId: string, selectedOption: string, nftTokenId: string): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'Cast',
            proposalId,
            selectedOption,
            nftTokenId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get voting results
     */
    async getVotingResults(proposalId: string): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetVotingResults',
            proposalId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }
} 