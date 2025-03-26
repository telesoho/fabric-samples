import { Context } from 'fabric-contract-api';
import { uid } from '../Utils';
import { ContractEvent } from '../ContractEvent';
import { ProposalJSON } from '../../types';
import { ProposalVote } from './ProposalVote';

interface ProposalOptions {
    title: string;
    description: string;
    proposer: string;
    startBlock: number;
    endBlock: number;
}

export class Proposal extends ContractEvent {
    public docType: string;
    public id: string;
    public title: string;
    public description: string;
    public proposer: string;
    public status: 'Active' | 'Passed' | 'Rejected' | 'Executed';
    public forVotes: number;
    public againstVotes: number;
    public startBlock: number;
    public endBlock: number;
    public created: string;
    public updated: string;
    public executed?: string;

    static docType(): string {
        return 'coconiko-proposal';
    }

    constructor(opts?: Partial<ProposalOptions>) {
        super(Proposal.docType());
        this.docType = Proposal.docType();
        this.id = `proposal_${uid()}`;
        this.title = opts?.title || '';
        this.description = opts?.description || '';
        this.proposer = opts?.proposer || '';
        this.status = 'Active';
        this.forVotes = 0;
        this.againstVotes = 0;
        this.startBlock = opts?.startBlock || 0;
        this.endBlock = opts?.endBlock || 0;
        this.created = new Date().toISOString();
        this.updated = new Date().toISOString();
    }

    async canUpdate(ctx: Context): Promise<boolean> {
        const hasVote = await this.hasVoted(ctx);
        return this.status === 'Active' && !hasVote;
    }

    async hasVoted(ctx: Context): Promise<boolean> {
        const iterator = await ctx.stub.getStateByPartialCompositeKey(ProposalVote.docType(), [this.id]);
        const res = await iterator.next();
        await iterator.close();
        if (res.done) {
            return false;
        }
        return true;
    }

    async update(ctx: Context, option: Partial<ProposalOptions>): Promise<Proposal> {
        const clientAccountID = ctx.clientIdentity.getID();
        if (this.proposer !== clientAccountID) {
            throw new Error('Only author can update proposal');
        }
        if (!await this.canUpdate(ctx)) {
            throw new Error(`Cannot update the proposal ${this.id}`);
        }

        const updateKeys: Array<keyof ProposalOptions> = [
            'title',
            'description',
            'proposer',
            'startBlock',
            'endBlock'
        ];

        for (const key of updateKeys) {
            if (option[key] !== undefined) {
                (this as any)[key] = option[key];
            }
        }
        
        this.updated = new Date().toISOString();
        await this.putState(ctx);
        return this;
    }

    isValidVote(support: boolean): boolean {
        return typeof support === 'boolean';
    }

    static fromJSON(json: ProposalJSON): Proposal {
        if (json.docType !== Proposal.docType()) {
            throw new Error(`docType must be ${Proposal.docType()}`);
        }
        const obj = new Proposal();
        Object.assign(obj, {
            docType: json.docType,
            id: json.id,
            title: json.title,
            description: json.description,
            proposer: json.proposer,
            status: json.status,
            forVotes: json.forVotes,
            againstVotes: json.againstVotes,
            startBlock: json.startBlock,
            endBlock: json.endBlock,
            created: json.created,
            updated: json.updated,
            executed: json.executed
        });
        return obj;
    }

    toJSON(): ProposalJSON {
        return {
            docType: this.docType,
            id: this.id,
            title: this.title,
            description: this.description,
            proposer: this.proposer,
            status: this.status,
            forVotes: this.forVotes,
            againstVotes: this.againstVotes,
            startBlock: this.startBlock,
            endBlock: this.endBlock,
            created: this.created,
            updated: this.updated,
            executed: this.executed
        };
    }

    static fromBuffer(buffer: Buffer | Uint8Array): Proposal {
        return Proposal.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer(): Buffer {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx: Context, proposalId: string): string {
        return ctx.stub.createCompositeKey(Proposal.docType(), [proposalId]);
    }

    getKey(ctx: Context): string {
        return Proposal.createKey(ctx, this.id);
    }

    async removeState(ctx: Context): Promise<void> {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx: Context): Promise<void> {
        const ret = await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
        return ret;
    }

    static async fromState(ctx: Context, proposalId: string): Promise<Proposal> {
        const key = Proposal.createKey(ctx, proposalId);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('Proposal not found');
        }
        return Proposal.fromBuffer(bufBytes);
    }
} 