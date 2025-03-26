'use strict';

const { ProposalVote } = require('./proposal-vote.js');
const { uid } = require('../Utils.js');
const {ContractEvent} = require('../ConstractEvent.js');

class Proposal extends ContractEvent {

    static docType() {
        return 'coconiko-proposal';
    }

    constructor(opt) {
        super(Proposal.docType());
        this.docType = Proposal.docType();
        this.proposalId= `proposal_${uid()}`;
        this.title= opt.title;
        this.description= opt.description;
        this.voteType= opt.voteType;
        this.choices= opt.choices;
        this.creator= opt.creator;
        this.isOpen= true;
        this.startDate= opt.startDate;
        this.endDate= opt.endDate;
        this.createAt= new Date().toISOString();
    }

    async canUpdate(ctx) {
        const hasVote = await this.hasVoted(ctx);
        return this.isOpen && !hasVote;
    }

    async hasVoted(ctx) {
        const iterator = await ctx.stub.getStateByPartialCompositeKey(ProposalVote.docType(), []);
        const res = await iterator.next();
        await iterator.close();
        if ( res.done ) {
            return false;
        }
        return true;
    }

    async update(ctx, option) {
        const clientAccountID = ctx.clientIdentity.getID();
        if (this.proposer !== clientAccountID) {
            throw new Error('Only author can update proposal');
        }
        if (!await this.canUpdate(ctx)) {
            throw new Error(`Cannot update the proposer ${this.proposalId}`);
        }

        const updateKeys = [
            'title',
            'description',
            'voteType',
            'choices',
            'creator',
            'isOpen',
            'startDate',
            'endDate'
        ];

        for(const key in updateKeys) {
            this[key] = option[key];
        }
        await this.putState(ctx);
        return this;
    }

    async isValidateVote(vote) {
        if(typeof vote === 'number' && vote >= 0 && vote < this.choices.length) {
            return true;
        }
        return false;
    }

    static fromJSON(json) {
        if(json.docType !== Proposal.docType()) {
            throw new Error(`docType must be ${Proposal.docType()}`);
        }
        const obj = new Proposal();
        Object.assign(obj, {
            docType: json.docType,
            proposalId: json.proposalId,
            title: json.title,
            description: json.description,
            voteType: json.voteType,
            choices: json.choices,
            voteResult: json.voteResult,
            creator: json.creator,
            isOpen: json.isOpen,
            startDate: json.startDate,
            endDate: json.endDate,
            createAt: json.createAt
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            proposalId: this.proposalId,
            title: this.title,
            description: this.description,
            voteType: this.voteType,
            choices: this.choices,
            voteResult: this.voteResult,
            creator: this.creator,
            isOpen: this.isOpen,
            startDate: this.startDate,
            endDate: this.endDate,
            createAt: this.createAt
        };
    }

    static fromBuffer(buffer) {
        return Proposal.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx, proposalId) {
        return ctx.stub.createCompositeKey(Proposal.docType(), [proposalId]);
    }

    getKey(ctx) {
        return Proposal.createKey(ctx, this.proposalId);
    }

    async removeState(ctx) {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx) {
        const ret = await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
        return ret;
    }

    static async fromState(ctx, proposalId) {
        const key = Proposal.createKey(proposalId);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('Proposal not found');
        }
        return Proposal.fromBuffer(bufBytes);
    }
}

module.exports = { Proposal };