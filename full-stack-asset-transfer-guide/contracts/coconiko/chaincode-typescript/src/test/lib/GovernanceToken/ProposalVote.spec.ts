import { Context } from 'fabric-contract-api';
import { ProposalVote } from '../../../lib/GovernanceToken/ProposalVote';
import { createMockContext, TestContext, setStateAsBuffer } from '../../mocks/fabric-mock';


describe('ProposalVote', () => {
    let ctx: TestContext;
    const proposalId = 'proposal_123';
    const voter = 'user1';
    const support = true;
    const votes = 50;
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create a vote with default values', () => {
            const vote = new ProposalVote();
            expect(vote.docType).toBe('coconiko-proposal-vote');
            expect(vote.proposalId).toBe('');
            expect(vote.voter).toBe('');
            expect(vote.support).toBe(false);
            expect(vote.votes).toBe(0);
            expect(vote.created).toBeDefined();
        });
        
        it('should create a vote with specified values', () => {
            const vote = new ProposalVote(proposalId, voter, support, votes);
            expect(vote.docType).toBe('coconiko-proposal-vote');
            expect(vote.proposalId).toBe(proposalId);
            expect(vote.voter).toBe(voter);
            expect(vote.support).toBe(support);
            expect(vote.votes).toBe(votes);
            expect(vote.created).toBeDefined();
        });
    });
    
    describe('fromJSON', () => {
        it('should create a vote from JSON data', () => {
            const now = new Date().toISOString();
            const json = {
                docType: 'coconiko-proposal-vote',
                proposalId,
                voter,
                support,
                votes,
                created: now
            };
            
            const vote = ProposalVote.fromJSON(json);
            expect(vote.docType).toBe('coconiko-proposal-vote');
            expect(vote.proposalId).toBe(proposalId);
            expect(vote.voter).toBe(voter);
            expect(vote.support).toBe(support);
            expect(vote.votes).toBe(votes);
            expect(vote.created).toBe(now);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json = {
                docType: 'wrong-type',
                proposalId,
                voter,
                support,
                votes,
                created: new Date().toISOString()
            };
            
            expect(() => ProposalVote.fromJSON(json)).toThrow('docType must be coconiko-proposal-vote');
        });
    });
    
    describe('toJSON', () => {
        it('should convert vote to JSON', () => {
            const vote = new ProposalVote(proposalId, voter, support, votes);
            const json = vote.toJSON();
            
            expect(json).toEqual({
                docType: 'coconiko-proposal-vote',
                proposalId,
                voter,
                support,
                votes,
                created: vote.created
            });
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const originalVote = new ProposalVote(proposalId, voter, support, votes);
            const buffer = originalVote.toBuffer();
            const restoredVote = ProposalVote.fromBuffer(buffer);
            
            expect(restoredVote.docType).toBe(originalVote.docType);
            expect(restoredVote.proposalId).toBe(originalVote.proposalId);
            expect(restoredVote.voter).toBe(originalVote.voter);
            expect(restoredVote.support).toBe(originalVote.support);
            expect(restoredVote.votes).toBe(originalVote.votes);
            expect(restoredVote.created).toBe(originalVote.created);
        });
    });
    
    describe('createKey/getKey', () => {
        it('should create a composite key for a vote', () => {
            const key = ProposalVote.createKey(ctx as unknown as Context, proposalId, voter);
            
            expect(key).toBe('coconiko-proposal-vote:proposal_123:user1');
        });
        
        it('should get the key for a vote instance', () => {
            const vote = new ProposalVote(proposalId, voter, support, votes);
            const key = vote.getKey(ctx as unknown as Context);
            
            expect(key).toBe('coconiko-proposal-vote:proposal_123:user1');
        });
    });
    
    describe('putState', () => {
        it('should store the vote in the ledger', async () => {
            const vote = new ProposalVote(proposalId, voter, support, votes);
            await vote.putState(ctx as unknown as Context);
            
            // Check that createCompositeKey was called with the right arguments
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-proposal-vote', [proposalId, voter]);
            
            // Check that putState was called with the buffer
            expect(ctx.stub.putState).toHaveBeenCalled();
        });
    });
    
    describe('removeState', () => {
        it('should remove the vote from the ledger', async () => {
            const vote = new ProposalVote(proposalId, voter, support, votes);
            await vote.removeState(ctx as unknown as Context);
            
            // Check that deleteState was called with the correct key
            expect(ctx.stub.deleteState).toHaveBeenCalledWith('coconiko-proposal-vote:proposal_123:user1');
        });
    });
    
    describe('fromState', () => {
        it('should retrieve a vote from the ledger', async () => {
            const now = new Date().toISOString();
            const voteData = {
                docType: 'coconiko-proposal-vote',
                proposalId,
                voter,
                support,
                votes,
                created: now
            };
            
            // Set up mock state
            const key = ctx.stub.createCompositeKey('coconiko-proposal-vote', [proposalId, voter]);
            setStateAsBuffer(ctx, key, voteData);
            
            // Retrieve the vote
            const vote = await ProposalVote.fromState(ctx as unknown as Context, proposalId, voter);
            
            expect(vote.docType).toBe('coconiko-proposal-vote');
            expect(vote.proposalId).toBe(proposalId);
            expect(vote.voter).toBe(voter);
            expect(vote.support).toBe(support);
            expect(vote.votes).toBe(votes);
            expect(vote.created).toBe(now);
        });
        
        it('should throw an error if the vote is not found', async () => {
            await expect(ProposalVote.fromState(ctx as unknown as Context, 'nonexistent', 'nonexistent')).rejects.toThrow('ProposalVote not found');
        });
    });
}); 