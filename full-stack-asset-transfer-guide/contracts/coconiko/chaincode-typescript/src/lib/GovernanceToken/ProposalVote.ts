import { Context } from 'fabric-contract-api';
import { ContractEvent } from '../ContractEvent';
import { ProposalVoteJSON } from '../../types';

export class ProposalVote extends ContractEvent {
    public docType: string;
    public proposalId: string;
    public voter: string;
    public support: boolean;
    public votes: number;
    public created: string;

    static docType(): string {
        return 'coconiko-proposal-vote';
    }

    constructor(proposalId?: string, voter?: string, support?: boolean, votes?: number) {
        super(ProposalVote.docType());
        this.docType = ProposalVote.docType();
        this.proposalId = proposalId || '';
        this.voter = voter || '';
        this.support = support || false;
        this.votes = votes || 0;
        this.created = new Date().toISOString();
    }

    static fromJSON(json: ProposalVoteJSON): ProposalVote {
        if (json.docType !== ProposalVote.docType()) {
            throw new Error(`docType must be ${ProposalVote.docType()}`);
        }

        const obj = new ProposalVote();

        Object.assign(obj, {
            proposalId: json.proposalId,
            voter: json.voter,
            support: json.support,
            votes: json.votes,
            created: json.created
        });
        return obj;
    }

    toJSON(): ProposalVoteJSON {
        return {
            docType: this.docType,
            proposalId: this.proposalId,
            voter: this.voter,
            support: this.support,
            votes: this.votes,
            created: this.created
        };
    }

    static fromBuffer(buffer: Buffer | Uint8Array): ProposalVote {
        return ProposalVote.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer(): Buffer {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx: Context, proposalId: string, voter: string): string {
        return ctx.stub.createCompositeKey(ProposalVote.docType(), [proposalId, voter]);
    }

    getKey(ctx: Context): string {
        return ProposalVote.createKey(ctx, this.proposalId, this.voter);
    }

    async removeState(ctx: Context): Promise<void> {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx: Context): Promise<void> {
        return await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx: Context, proposalId: string, voter: string): Promise<ProposalVote> {
        const key = ProposalVote.createKey(ctx, proposalId, voter);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('ProposalVote not found');
        }
        return ProposalVote.fromBuffer(bufBytes);
    }
} 