import { Context } from 'fabric-contract-api';
import { GovernanceToken } from '../../../lib/GovernanceToken/GovernanceToken';
import { createMockContext, TestContext, setStateAsBuffer } from '../../mocks/fabric-mock';

describe('GovernanceToken', () => {
    let ctx: TestContext;
    const owner = 'user1';
    const amount = 100;
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create a token with default values', () => {
            const token = new GovernanceToken();
            expect(token.docType).toBe('coconiko-governance-token');
            expect(token.id).toMatch(/^gtoken_/);
            expect(token.owner).toBe('');
            expect(token.amount).toBe(0);
            expect(token.created).toBeDefined();
        });
        
        it('should create a token with specified values', () => {
            const token = new GovernanceToken(owner, amount);
            expect(token.docType).toBe('coconiko-governance-token');
            expect(token.id).toMatch(/^gtoken_/);
            expect(token.owner).toBe(owner);
            expect(token.amount).toBe(amount);
            expect(token.created).toBeDefined();
        });
    });
    
    describe('fromJSON', () => {
        it('should create a token from JSON data', () => {
            const now = new Date().toISOString();
            const id = 'gtoken_123';
            const json = {
                docType: 'coconiko-governance-token',
                id,
                owner,
                amount,
                created: now
            };
            
            const token = GovernanceToken.fromJSON(json);
            expect(token.docType).toBe('coconiko-governance-token');
            expect(token.id).toBe(id);
            expect(token.owner).toBe(owner);
            expect(token.amount).toBe(amount);
            expect(token.created).toBe(now);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json = {
                docType: 'wrong-type',
                id: 'gtoken_123',
                owner,
                amount,
                created: new Date().toISOString()
            };
            
            expect(() => GovernanceToken.fromJSON(json)).toThrow('docType must be coconiko-governance-token');
        });
    });
    
    describe('toJSON', () => {
        it('should convert token to JSON', () => {
            const token = new GovernanceToken(owner, amount);
            const json = token.toJSON();
            
            expect(json).toEqual({
                docType: 'coconiko-governance-token',
                id: token.id,
                owner,
                amount,
                created: token.created
            });
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const originalToken = new GovernanceToken(owner, amount);
            const buffer = originalToken.toBuffer();
            const restoredToken = GovernanceToken.fromBuffer(buffer);
            
            expect(restoredToken.docType).toBe(originalToken.docType);
            expect(restoredToken.id).toBe(originalToken.id);
            expect(restoredToken.owner).toBe(originalToken.owner);
            expect(restoredToken.amount).toBe(originalToken.amount);
            expect(restoredToken.created).toBe(originalToken.created);
        });
    });
    
    describe('createKey/getKey', () => {
        it('should create a composite key for a token', () => {
            const id = 'gtoken_123';
            const key = GovernanceToken.createKey(ctx as unknown as Context, id);
            
            expect(key).toBe('coconiko-governance-token:gtoken_123');
        });
        
        it('should get the key for a token instance', () => {
            const token = new GovernanceToken(owner, amount);
            const key = token.getKey(ctx as unknown as Context);
            
            expect(key).toMatch(/^coconiko-governance-token:gtoken_/);
        });
    });
    
    describe('putState', () => {
        it('should store the token in the ledger', async () => {
            const token = new GovernanceToken(owner, amount);
            await token.putState(ctx as unknown as Context);
            
            // Check that createCompositeKey was called with the right arguments
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-governance-token', [token.id]);
            
            // Check that putState was called with the buffer
            expect(ctx.stub.putState).toHaveBeenCalled();
        });
    });
    
    describe('removeState', () => {
        it('should remove the token from the ledger', async () => {
            const token = new GovernanceToken(owner, amount);
            await token.removeState(ctx as unknown as Context);
            
            // The key format should match our token ID pattern
            const keyPattern = /^coconiko-governance-token:gtoken_/;
            
            // Check that deleteState was called with the correct key pattern
            const calls = ctx.stub.deleteState.mock.calls;
            let foundMatch = false;
            
            for (const call of calls) {
                if (keyPattern.test(call[0])) {
                    foundMatch = true;
                    break;
                }
            }
            
            expect(foundMatch).toBe(true);
        });
    });
    
    describe('fromState', () => {
        it('should retrieve a token from the ledger', async () => {
            const id = 'gtoken_123';
            const now = new Date().toISOString();
            const tokenData = {
                docType: 'coconiko-governance-token',
                id,
                owner,
                amount,
                created: now
            };
            
            // Set up mock state
            const key = ctx.stub.createCompositeKey('coconiko-governance-token', [id]);
            setStateAsBuffer(ctx, key, tokenData);
            
            // Retrieve the token
            const token = await GovernanceToken.fromState(ctx as unknown as Context, id);
            
            expect(token.docType).toBe('coconiko-governance-token');
            expect(token.id).toBe(id);
            expect(token.owner).toBe(owner);
            expect(token.amount).toBe(amount);
            expect(token.created).toBe(now);
        });
        
        it('should throw an error if the token is not found', async () => {
            await expect(GovernanceToken.fromState(ctx as unknown as Context, 'nonexistent')).rejects.toThrow('GovernanceToken not found');
        });
    });
}); 