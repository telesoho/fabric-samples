import { Context } from 'fabric-contract-api';
import { CoconikoNFT } from '../../../lib/NFT/CoconikoNFT';
import { createMockContext, TestContext, setStateAsBuffer } from '../../mocks/fabric-mock';
import { NFTMetadata } from '../../../types';
import { ContractEvent } from '../../../lib/ContractEvent';

describe('CoconikoNFT', () => {
    let ctx: TestContext;
    const owner = 'user1';
    const metadata: NFTMetadata = {
        name: 'Test NFT',
        description: 'This is a test NFT',
        image: 'https://example.com/image.png',
        attributes: [
            { trait_type: 'rarity', value: 'common' }
        ]
    };
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create an NFT with default values', () => {
            const nft = new CoconikoNFT();
            expect(nft.data.docType).toBe('coconiko-nft');
            expect(nft.data.id).toMatch(/^nft_/);
            expect(nft.data.owner).toBe('');
            expect(nft.data.creator).toBe('');
            expect(nft.data.metadata).toEqual({ name: '' });
            expect(nft.data.burned).toBe(false);
            expect(nft.data.created).toBeDefined();
            expect(nft.data.lastUpdated).toBeDefined();
        });
        
        it('should create an NFT with specified values', () => {
            const nft = new CoconikoNFT(owner, metadata);
            expect(nft.data.docType).toBe('coconiko-nft');
            expect(nft.data.id).toMatch(/^nft_/);
            expect(nft.data.owner).toBe(owner);
            expect(nft.data.creator).toBe(owner);
            expect(nft.data.metadata).toEqual(metadata);
            expect(nft.data.burned).toBe(false);
            expect(nft.data.created).toBeDefined();
            expect(nft.data.lastUpdated).toBeDefined();
        });
    });
    
    describe('fromJSON', () => {
        it('should create an NFT from JSON data', () => {
            const now = new Date().toISOString();
            const id = 'nft_123';
            const json = {
                docType: 'coconiko-nft',
                id,
                owner,
                creator: owner,
                metadata,
                created: now,
                lastUpdated: now,
                burned: false
            };
            
            const nft = CoconikoNFT.fromJSON(json);
            expect(nft.data).toEqual(json);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json = {
                docType: 'wrong-type',
                id: 'nft_123',
                owner,
                creator: owner,
                metadata,
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                burned: false
            };
            
            expect(() => CoconikoNFT.fromJSON(json)).toThrow('docType must be coconiko-nft');
        });
        
        it('should handle partial JSON data', () => {
            const json = {
                docType: 'coconiko-nft'
            };
            
            const nft = CoconikoNFT.fromJSON(json);
            expect(nft.data.docType).toBe('coconiko-nft');
            expect(nft.data.id).toMatch(/^nft_/);
            expect(nft.data.owner).toBe('');
            expect(nft.data.creator).toBe('');
            expect(nft.data.metadata).toEqual({ name: '' });
            expect(nft.data.burned).toBe(false);
            expect(nft.data.created).toBeDefined();
            expect(nft.data.lastUpdated).toBeDefined();
        });
    });
    
    describe('toJSON', () => {
        it('should convert NFT to JSON', () => {
            const nft = new CoconikoNFT(owner, metadata);
            const json = nft.toJSON();
            
            expect(json).toEqual(nft.data);
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const originalNFT = new CoconikoNFT(owner, metadata);
            const buffer = originalNFT.toBuffer();
            const restoredNFT = CoconikoNFT.fromBuffer(buffer);
            
            expect(restoredNFT.data).toEqual(originalNFT.data);
        });
    });
    
    describe('createKey/getKey', () => {
        it('should create a composite key for an NFT', () => {
            const id = 'nft_123';
            const key = CoconikoNFT.createKey(ctx as unknown as Context, id);
            
            expect(key).toBe('coconiko-nft:nft_123');
        });
        
        it('should get the key for an NFT instance', () => {
            const nft = new CoconikoNFT(owner, metadata);
            const key = nft.getKey(ctx as unknown as Context);
            
            expect(key).toMatch(/^coconiko-nft:nft_/);
        });
    });
    
    describe('putState', () => {
        it('should store the NFT in the ledger and add an event', async () => {
            const nft = new CoconikoNFT('user1', { name: 'Test NFT' });
            
            // Add a spy for ContractEvent.addEvent
            jest.spyOn(ContractEvent, 'addEvent').mockImplementation(() => {
                // Explicitly trigger setEvent to simulate what ContractEvent.addEvent would do
                ctx.stub.setEvent('nft-event', Buffer.from(JSON.stringify(nft.data)));
                return;
            });
            
            await nft.putState(ctx as unknown as Context);
            
            // Check that createCompositeKey was called with the right arguments
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith('coconiko-nft', [nft.data.id]);
            
            // Check that putState was called with the buffer
            expect(ctx.stub.putState).toHaveBeenCalled();
            
            // Check that setEvent was called (due to ContractEvent.addEvent)
            expect(ctx.stub.setEvent).toHaveBeenCalled();
        });
    });
    
    describe('removeState', () => {
        it('should remove the NFT from the ledger', async () => {
            const nft = new CoconikoNFT(owner, metadata);
            await nft.removeState(ctx as unknown as Context);
            
            // The key format should match our NFT ID pattern
            const keyPattern = /^coconiko-nft:nft_/;
            
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
        it('should retrieve an NFT from the ledger', async () => {
            const id = 'nft_123';
            const now = new Date().toISOString();
            const nftData = {
                docType: 'coconiko-nft',
                id,
                owner,
                creator: owner,
                metadata,
                created: now,
                lastUpdated: now,
                burned: false
            };
            
            // Set up mock state
            const key = ctx.stub.createCompositeKey('coconiko-nft', [id]);
            setStateAsBuffer(ctx, key, nftData);
            
            // Retrieve the NFT
            const nft = await CoconikoNFT.fromState(ctx as unknown as Context, id);
            
            expect(nft.data).toEqual(nftData);
        });
        
        it('should throw an error if the NFT is not found', async () => {
            await expect(CoconikoNFT.fromState(ctx as unknown as Context, 'nonexistent')).rejects.toThrow('NFT nonexistent not found');
        });
    });
}); 