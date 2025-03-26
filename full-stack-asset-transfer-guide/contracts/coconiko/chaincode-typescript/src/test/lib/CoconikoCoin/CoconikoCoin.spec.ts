import { Context } from 'fabric-contract-api';
import { CoconikoCoin } from '../../../lib/CoconikoCoin/CoconikoCoin';
import { createMockContext, TestContext, setStateAsBuffer } from '../../mocks/fabric-mock';

describe('CoconikoCoin', () => {
    let ctx: TestContext;
    const owner = 'user1';
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create a coin with default values', () => {
            const coin = new CoconikoCoin();
            expect(coin.data.docType).toBe('coconiko-coin');
            expect(coin.data.amount).toBe(0);
            expect(coin.data.owner).toBe('');
            expect(coin.data.burned).toBe(false);
            expect(coin.data.expirationDate).toBeUndefined();
        });
        
        it('should create a coin with specified values', () => {
            const coin = new CoconikoCoin(100, 30, owner);
            expect(coin.data.docType).toBe('coconiko-coin');
            expect(coin.data.amount).toBe(100);
            expect(coin.data.owner).toBe(owner);
            expect(coin.data.burned).toBe(false);
            
            // Check that expirationDate is set to 30 days from now (±1 day for test timing)
            const expirationDate = new Date(coin.data.expirationDate!);
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + 30);
            
            // Compare only year, month, day (not time)
            expect(expirationDate.getFullYear()).toBe(expectedDate.getFullYear());
            expect(expirationDate.getMonth()).toBe(expectedDate.getMonth());
            // Allow ±1 day for test timing
            expect(Math.abs(expirationDate.getDate() - expectedDate.getDate())).toBeLessThanOrEqual(1);
        });
        
        it('should create a coin without expiration date if days is undefined', () => {
            const coin = new CoconikoCoin(100, undefined, owner);
            expect(coin.data.expirationDate).toBeUndefined();
        });
        
        it('should throw an error if days is negative', () => {
            expect(() => new CoconikoCoin(100, -1, owner)).toThrow('days must >= 0');
        });
    });
    
    describe('fromJSON', () => {
        it('should create a coin from JSON data', () => {
            const json = {
                docType: 'coconiko-coin',
                amount: 100,
                owner: owner,
                burned: false,
                expirationDate: '2023-12-31'
            };
            
            const coin = CoconikoCoin.fromJSON(json);
            expect(coin.data).toEqual(json);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json = {
                docType: 'wrong-type',
                amount: 100,
                owner: owner,
                burned: false
            };
            
            expect(() => CoconikoCoin.fromJSON(json)).toThrow('docType must be coconiko-coin');
        });
        
        it('should handle partial JSON data', () => {
            const json = {
                docType: 'coconiko-coin'
            };
            
            const coin = CoconikoCoin.fromJSON(json);
            expect(coin.data.docType).toBe('coconiko-coin');
            expect(coin.data.amount).toBe(0);
            expect(coin.data.owner).toBe('');
            expect(coin.data.burned).toBe(false);
            expect(coin.data.expirationDate).toBeUndefined();
        });
    });
    
    describe('toJSON', () => {
        it('should convert coin to JSON', () => {
            const coin = new CoconikoCoin(100, 30, owner);
            const json = coin.toJSON();
            
            expect(json.docType).toBe('coconiko-coin');
            expect(json.amount).toBe(100);
            expect(json.owner).toBe(owner);
            expect(json.burned).toBe(false);
            expect(json.expirationDate).toBeDefined();
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const originalCoin = new CoconikoCoin(100, 30, owner);
            const buffer = originalCoin.toBuffer();
            const restoredCoin = CoconikoCoin.fromBuffer(buffer);
            
            expect(restoredCoin.data).toEqual(originalCoin.data);
        });
    });
    
    describe('createKey', () => {
        it('should create a composite key with expiration date', () => {
            const expirationDate = '2023-12-31';
            const key = CoconikoCoin.createKey(ctx as unknown as Context, owner, expirationDate);
            
            expect(key).toBe('coconiko-coin:user1:2023-12-31');
        });
        
        it('should create a composite key without expiration date', () => {
            const key = CoconikoCoin.createKey(ctx as unknown as Context, owner);
            
            expect(key).toBe('coconiko-coin:user1');
        });
    });
    
    describe('getKey', () => {
        it('should get the key for a coin with expiration date', () => {
            const coin = new CoconikoCoin(100, 30, owner);
            const key = coin.getKey(ctx as unknown as Context);
            
            // The key format should be 'coconiko-coin:user1:YYYY-MM-DD'
            expect(key).toMatch(/^coconiko-coin:user1:\d{4}-\d{2}-\d{2}$/);
        });
        
        it('should get the key for a coin without expiration date', () => {
            const coin = new CoconikoCoin(100, undefined, owner);
            const key = coin.getKey(ctx as unknown as Context);
            
            expect(key).toBe('coconiko-coin:user1');
        });
    });
    
    describe('putState', () => {
        it('should store the coin in the ledger', async () => {
            const coin = new CoconikoCoin(100, 30, owner);
            await coin.putState(ctx as unknown as Context);
            
            // The key format is 'coconiko-coin:user1:YYYY-MM-DD'
            const keyPattern = /^coconiko-coin:user1:\d{4}-\d{2}-\d{2}$/;
            
            // Check that putState was called with the correct key pattern
            const calls = ctx.stub.putState.mock.calls;
            let foundMatch = false;
            
            for (const call of calls) {
                if (keyPattern.test(call[0])) {
                    foundMatch = true;
                    const value = JSON.parse(call[1].toString());
                    expect(value.amount).toBe(100);
                    expect(value.owner).toBe(owner);
                    expect(value.burned).toBe(false);
                    expect(value.expirationDate).toBeDefined();
                    break;
                }
            }
            
            expect(foundMatch).toBe(true);
        });
    });
    
    describe('removeState', () => {
        it('should remove the coin from the ledger', async () => {
            const coin = new CoconikoCoin(100, 30, owner);
            await coin.removeState(ctx as unknown as Context);
            
            // The key format is 'coconiko-coin:user1:YYYY-MM-DD'
            const keyPattern = /^coconiko-coin:user1:\d{4}-\d{2}-\d{2}$/;
            
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
        it('should retrieve a coin from the ledger', async () => {
            const expirationDate = '2023-12-31';
            const coinData = {
                docType: 'coconiko-coin',
                amount: 100,
                owner: owner,
                burned: false,
                expirationDate
            };
            
            // Set up mock state
            const key = ctx.stub.createCompositeKey('coconiko-coin', [owner, expirationDate]);
            setStateAsBuffer(ctx, key, coinData);
            
            // Retrieve the coin
            const coin = await CoconikoCoin.fromState(ctx as unknown as Context, owner, expirationDate);
            
            expect(coin.data).toEqual(coinData);
        });
        
        it('should throw an error if the coin is not found', async () => {
            await expect(CoconikoCoin.fromState(ctx as unknown as Context, 'nonexistent')).rejects.toThrow('Coin not found');
        });
    });
}); 