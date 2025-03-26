'use strict';

const {ContractEvent} = require('../ConstractEvent.js');

class ProposalVote extends ContractEvent {

    static docType() {
        return 'coconiko-proposal-vote';
    }

    constructor(proposalId, gtokenId, vote) {
        super(ProposalVote.docType());
        this.docType = ProposalVote.docType();
        this.proposalId = proposalId;
        this.gtokenId = gtokenId;
        this.vote = vote;
    }

    static fromJSON(json) {
        if(json.docType !== ProposalVote.docType()) {
            throw new Error(`docType must be ${ProposalVote.docType()}`);
        }

        const obj = new ProposalVote();

        Object.assign(obj, {
            proposalId: json.proposalId,
            gtokenId: json.gtokenId,
            vote: json.vote
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            proposalId: this.proposalId,
            gtokenId: this.gtokenId,
            vote: this.vote
        };
    }

    static fromBuffer(buffer) {
        return ProposalVote.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx, proposalId, gtokenId) {
        return ctx.stub.createCompositeKey(ProposalVote.docType(), [proposalId, gtokenId]);
    }

    getKey(ctx) {
        return ProposalVote.createKey(ctx, this.proposalId, this.governanceToken);
    }

    async removeState(ctx) {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx) {
        return await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx, proposalId, gtokenId) {
        const key = ProposalVote.createKey(proposalId, gtokenId);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('ProposalVote not found');
        }
        return ProposalVote.fromBuffer(bufBytes);
    }
}

module.exports = { ProposalVote };