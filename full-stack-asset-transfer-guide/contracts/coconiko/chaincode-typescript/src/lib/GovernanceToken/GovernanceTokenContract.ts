import { Context, Contract } from 'fabric-contract-api';
import { GovernanceToken } from './GovernanceToken';
import { Proposal } from './Proposal';
import { ProposalVote } from './ProposalVote';
import { ContractEvent } from '../ContractEvent';

const orgMSPID = 'sdlMSP';

export class GovernanceTokenContract extends Contract {

    constructor() {
        super('GovernanceTokenContract');
    }

    async CreateProposal(ctx: Context, proposalJson: string): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();

        const opts = JSON.parse(proposalJson);
        opts.proposer = user;

        const proposal = new Proposal(opts);
        await proposal.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return proposal.toJSON();
    }

    async MintGovernanceToken(ctx: Context, amount: number): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();

        const gtoken = new GovernanceToken(user, amount);
        await gtoken.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return gtoken.toJSON();
    }

    async Vote(ctx: Context, proposalId: string, tokenId: string, support: boolean): Promise<Record<string, unknown>> {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();
        const gtoken = await GovernanceToken.fromState(ctx, tokenId);
        if (gtoken.owner !== user) {
            throw new Error(`${tokenId} access deny.`);
        }

        const proposal = await Proposal.fromState(ctx, proposalId);

        if (!proposal.isValidVote(support)) {
            throw new Error('Invalid vote');
        }

        const proposalVote = new ProposalVote(proposalId, user, support, gtoken.amount);
        await proposalVote.putState(ctx);

        // Update the vote count on the proposal
        if (support) {
            proposal.forVotes += gtoken.amount;
        } else {
            proposal.againstVotes += gtoken.amount;
        }
        
        proposal.updated = new Date().toISOString();
        await proposal.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return proposal.toJSON();
    }

    async Patch(ctx: Context, key: string, data: string): Promise<void> {
        // Check minter authorization - assumes orgMSPID is the issuer with privilege to mint a new token
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error(`clientMSPID:${clientMSPID}:client is not authorized to patch`);
        }
        await ctx.stub.putState(key, Buffer.from(data));
    }
} 