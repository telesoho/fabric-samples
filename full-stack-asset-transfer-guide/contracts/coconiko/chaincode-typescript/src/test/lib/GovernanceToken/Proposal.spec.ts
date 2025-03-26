import { Context } from 'fabric-contract-api';
import { Proposal } from '../../../lib/GovernanceToken/Proposal';
import { createMockContext, TestContext, setStateAsBuffer } from '../../mocks/fabric-mock';
import { ContractEvent } from '../../../lib/ContractEvent';
import { ProposalJSON } from '../../../types';

describe('Proposal', () => {
    let ctx: TestContext;
    const proposalId = 'proposal_123';
    const title = 'Test Proposal';
    const description = 'This is a test proposal';
    const proposer = 'user1';
    const startBlock = 100;
    const endBlock = 200;
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create a proposal with default values', () => {
            const proposal = new Proposal();
            expect(proposal.docType).toBe('coconiko-proposal');
            expect(proposal.id).toMatch(/^proposal_/); // ID should be generated
            expect(proposal.title).toBe('');
            expect(proposal.description).toBe('');
            expect(proposal.proposer).toBe('');
            expect(proposal.status).toBe('Active');
            expect(proposal.forVotes).toBe(0);
            expect(proposal.againstVotes).toBe(0);
            expect(proposal.startBlock).toBe(0);
            expect(proposal.endBlock).toBe(0);
            expect(proposal.created).toBeDefined();
            expect(proposal.updated).toBeDefined();
            expect(proposal.executed).toBeUndefined();
        });
        
        it('should create a proposal with specified values', () => {
            const proposal = new Proposal({
                title,
                description,
                proposer,
                startBlock,
                endBlock
            });
            
            expect(proposal.docType).toBe('coconiko-proposal');
            expect(proposal.id).toMatch(/^proposal_/);
            expect(proposal.title).toBe(title);
            expect(proposal.description).toBe(description);
            expect(proposal.proposer).toBe(proposer);
            expect(proposal.status).toBe('Active');
            expect(proposal.forVotes).toBe(0);
            expect(proposal.againstVotes).toBe(0);
            expect(proposal.startBlock).toBe(startBlock);
            expect(proposal.endBlock).toBe(endBlock);
            expect(proposal.created).toBeDefined();
            expect(proposal.updated).toBeDefined();
            expect(proposal.executed).toBeUndefined();
        });
    });
    
    describe('fromJSON', () => {
        it('should create a proposal from JSON data', () => {
            const now = new Date().toISOString();
            const json: ProposalJSON = {
                docType: 'coconiko-proposal',
                id: proposalId,
                title,
                description,
                proposer,
                status: 'Passed',
                forVotes: 100,
                againstVotes: 50,
                startBlock,
                endBlock,
                created: now,
                updated: now,
                executed: now
            };
            
            const proposal = Proposal.fromJSON(json);
            expect(proposal.docType).toBe('coconiko-proposal');
            expect(proposal.id).toBe(proposalId);
            expect(proposal.title).toBe(title);
            expect(proposal.description).toBe(description);
            expect(proposal.proposer).toBe(proposer);
            expect(proposal.status).toBe('Passed');
            expect(proposal.forVotes).toBe(100);
            expect(proposal.againstVotes).toBe(50);
            expect(proposal.startBlock).toBe(startBlock);
            expect(proposal.endBlock).toBe(endBlock);
            expect(proposal.created).toBe(now);
            expect(proposal.updated).toBe(now);
            expect(proposal.executed).toBe(now);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json: Partial<ProposalJSON> = {
                docType: 'wrong-type',
                id: proposalId,
                title,
                description,
                proposer
            };
            
            expect(() => Proposal.fromJSON(json as ProposalJSON)).toThrow('docType must be coconiko-proposal');
        });
    });
    
    describe('toJSON', () => {
        it('should convert proposal to JSON', () => {
            const proposal = new Proposal({
                title,
                description,
                proposer,
                startBlock,
                endBlock
            });
            
            const json = proposal.toJSON();
            
            expect(json).toEqual({
                docType: 'coconiko-proposal',
                id: proposal.id,
                title,
                description,
                proposer,
                status: 'Active',
                forVotes: 0,
                againstVotes: 0,
                startBlock,
                endBlock,
                created: proposal.created,
                updated: proposal.updated,
                executed: undefined
            });
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const originalProposal = new Proposal({
                title,
                description,
                proposer,
                startBlock,
                endBlock
            });
            
            originalProposal.status = 'Passed';
            originalProposal.forVotes = 100;
            originalProposal.againstVotes = 50;
            
            const buffer = originalProposal.toBuffer();
            const restoredProposal = Proposal.fromBuffer(buffer);
            
            expect(restoredProposal.docType).toBe(originalProposal.docType);
            expect(restoredProposal.id).toBe(originalProposal.id);
            expect(restoredProposal.title).toBe(originalProposal.title);
            expect(restoredProposal.description).toBe(originalProposal.description);
            expect(restoredProposal.proposer).toBe(originalProposal.proposer);
            expect(restoredProposal.status).toBe(originalProposal.status);
            expect(restoredProposal.forVotes).toBe(originalProposal.forVotes);
            expect(restoredProposal.againstVotes).toBe(originalProposal.againstVotes);
            expect(restoredProposal.startBlock).toBe(originalProposal.startBlock);
            expect(restoredProposal.endBlock).toBe(originalProposal.endBlock);
            expect(restoredProposal.created).toBe(originalProposal.created);
            expect(restoredProposal.updated).toBe(originalProposal.updated);
        });
    });
    
    describe('createKey/getKey', () => {
        it('should create a composite key for a proposal', () => {
            Proposal.createKey(ctx as unknown as Context, proposalId);
            
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-proposal', [proposalId]);
        });
        
        it('should get the key for a proposal instance', () => {
            const proposal = new Proposal();
            // Replace the generated ID with a known value for testing
            proposal.id = proposalId;
            
            proposal.getKey(ctx as unknown as Context);
            
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-proposal', [proposalId]);
        });
    });
    
    describe('putState', () => {
        it('should store the proposal in the ledger and add an event', async () => {
            // Spy on ContractEvent.addEvent
            jest.spyOn(ContractEvent, 'addEvent').mockImplementation(() => {
                // Simulate what ContractEvent.addEvent would do
                ctx.stub.setEvent('proposal-event', Buffer.from(JSON.stringify({
                    id: proposalId,
                    title,
                    description
                })));
                return;
            });
            
            const proposal = new Proposal({
                title,
                description,
                proposer
            });
            proposal.id = proposalId; // Set the ID to a known value
            
            await proposal.putState(ctx as unknown as Context);
            
            // Verify that createCompositeKey was called with the correct arguments
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-proposal', [proposalId]);
            
            // Verify that putState was called with a buffer
            expect(ctx.stub.putState).toHaveBeenCalled();
            
            // Verify that an event was set (through ContractEvent.addEvent)
            expect(ctx.stub.setEvent).toHaveBeenCalled();
            
            // Clean up
            jest.restoreAllMocks();
        });
    });
    
    describe('removeState', () => {
        it('should remove the proposal from the ledger', async () => {
            const proposal = new Proposal();
            proposal.id = proposalId; // Set the ID to a known value
            
            await proposal.removeState(ctx as unknown as Context);
            
            // Verify that deleteState was called with the correct key
            expect(ctx.stub.deleteState).toHaveBeenCalled();
        });
    });
    
    describe('fromState', () => {
        it('should retrieve a proposal from the ledger', async () => {
            const now = new Date().toISOString();
            const proposalData: ProposalJSON = {
                docType: 'coconiko-proposal',
                id: proposalId,
                title,
                description,
                proposer,
                status: 'Passed',
                forVotes: 100,
                againstVotes: 50,
                startBlock,
                endBlock,
                created: now,
                updated: now,
                executed: now
            };
            
            // Set up mock state
            const compositeKey = ctx.stub.createCompositeKey('coconiko-proposal', [proposalId]);
            setStateAsBuffer(ctx, compositeKey, proposalData);
            
            // Retrieve the proposal
            const proposal = await Proposal.fromState(ctx as unknown as Context, proposalId);
            
            expect(proposal.docType).toBe('coconiko-proposal');
            expect(proposal.id).toBe(proposalId);
            expect(proposal.title).toBe(title);
            expect(proposal.description).toBe(description);
            expect(proposal.proposer).toBe(proposer);
            expect(proposal.status).toBe('Passed');
            expect(proposal.forVotes).toBe(100);
            expect(proposal.againstVotes).toBe(50);
            expect(proposal.startBlock).toBe(startBlock);
            expect(proposal.endBlock).toBe(endBlock);
            expect(proposal.created).toBe(now);
            expect(proposal.updated).toBe(now);
            expect(proposal.executed).toBe(now);
        });
        
        it('should throw an error if the proposal is not found', async () => {
            // Set up getState to return empty result
            ctx.stub.getState.mockResolvedValue(Buffer.from(''));
            
            await expect(Proposal.fromState(ctx as unknown as Context, 'nonexistent')).rejects.toThrow('Proposal not found');
        });
    });
}); 