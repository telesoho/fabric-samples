'use strict';

const { Contract } = require('fabric-contract-api');
const { GovernanceToken } = require('./governance-token.js');
const { Proposal } = require('./proposal.js');
const { ProposalVote } = require('./proposal-vote.js');
const { ContractEvent } = require('../ConstractEvent.js');

const orgMSPID = 'sdlMSP';

class GovernanceTokenContract extends Contract {

    constructor() {
        super('GovernanceTokenContract');
    }

    async CreateProposal(ctx, proposalJson) {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();

        let opts = JSON.parse(proposalJson);
        opts.creator= user;

        const proposal = new Proposal(opts);
        await proposal.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return proposal.toJSON();
    }

    async MintGovernanceToken(ctx, tokenType) {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();

        const gtoken = new GovernanceToken(user, tokenType);
        await gtoken.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return gtoken.toJSON();
    }

    async Vote(ctx, proposalId, gtokenId, vote) {
        ContractEvent.initEvents();

        const user = ctx.clientIdentity.getID();
        const gtoken = await GovernanceToken.fromState(ctx, gtokenId);
        if(gtoken.owner !== user) {
            throw new Error(`${gtokenId} access deny.`);
        }

        const proposal = await Proposal.fromState(ctx, proposalId);

        if (!proposal.isValidateVote(vote)){
            throw new Error('Invalid vote');
        }

        const proposalVote = new ProposalVote(proposalId, gtokenId, vote);
        await proposalVote.putState(ctx);

        ContractEvent.commitEvents(ctx);
        return gtoken.toJSON();
    }

    async Patch(ctx, key, data) {
        // Check minter authorization - assumes orgMSPID is the issuer with privilege to mint a new token
        const clientMSPID = ctx.clientIdentity.getMSPID();
        if (clientMSPID !== orgMSPID) {
            throw new Error(`clientMSPID:${clientMSPID}:client is not authorized to patch`);
        }
        await ctx.stub.putState(key, Buffer.from(data));
    }
}

module.exports = { GovernanceTokenContract };
