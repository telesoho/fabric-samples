import { Context } from 'fabric-contract-api';
import { NFTTransferEvent } from '../../../lib/NFT/NFTTransferEvent';
import { createMockContext, TestContext } from '../../mocks/fabric-mock';
import { ContractEvent } from '../../../lib/ContractEvent';

describe('NFTTransferEvent', () => {
    let ctx: TestContext;
    const from = 'user1';
    const to = 'user2';
    const nftId = 'nft_123';
    
    beforeEach(() => {
        ctx = createMockContext();
    });
    
    describe('constructor', () => {
        it('should create a transfer event with the specified values', () => {
            const event = new NFTTransferEvent(from, to, nftId);
            
            expect(event.data.docType).toBe('nft-transfer-event');
            expect(event.data.from).toBe(from);
            expect(event.data.to).toBe(to);
            expect(event.data.nftId).toBe(nftId);
            expect(event.data.timestamp).toBeDefined();
        });
    });
    
    describe('fromJSON', () => {
        it('should create a transfer event from JSON data', () => {
            const timestamp = '2023-01-01T12:00:00.000Z';
            const json = {
                docType: 'nft-transfer-event',
                from,
                to,
                nftId,
                timestamp
            };
            
            const event = NFTTransferEvent.fromJSON(json);
            
            expect(event.data.docType).toBe('nft-transfer-event');
            expect(event.data.from).toBe(from);
            expect(event.data.to).toBe(to);
            expect(event.data.nftId).toBe(nftId);
            expect(event.data.timestamp).toBe(timestamp);
        });
        
        it('should throw an error if docType is incorrect', () => {
            const json = {
                docType: 'wrong-type',
                from,
                to,
                nftId,
                timestamp: '2023-01-01T12:00:00.000Z'
            };
            
            expect(() => NFTTransferEvent.fromJSON(json)).toThrow('docType must be nft-transfer-event');
        });
        
        it('should handle missing fields and set defaults', () => {
            const json = {
                docType: 'nft-transfer-event',
                nftId
            };
            
            const event = NFTTransferEvent.fromJSON(json);
            
            expect(event.data.from).toBe('');
            expect(event.data.to).toBe('');
            expect(event.data.timestamp).toBeDefined();
        });
    });
    
    describe('toJSON', () => {
        it('should convert the transfer event to JSON', () => {
            const timestamp = '2023-01-01T12:00:00.000Z';
            const event = new NFTTransferEvent(from, to, nftId);
            event.data.timestamp = timestamp;
            
            const json = event.toJSON();
            
            expect(json.docType).toBe('nft-transfer-event');
            expect(json.from).toBe(from);
            expect(json.to).toBe(to);
            expect(json.nftId).toBe(nftId);
            expect(json.timestamp).toBe(timestamp);
        });
    });
    
    describe('fromBuffer/toBuffer', () => {
        it('should convert between buffer and object', () => {
            const event = new NFTTransferEvent(from, to, nftId);
            const buffer = Buffer.from(JSON.stringify(event.data));
            const newEvent = NFTTransferEvent.fromBuffer(buffer);
            
            expect(newEvent.data.docType).toBe('nft-transfer-event');
            expect(newEvent.data.from).toBe(from);
            expect(newEvent.data.to).toBe(to);
            expect(newEvent.data.nftId).toBe(nftId);
        });
    });
    
    describe('createKey/getKey', () => {
        it('should create a key for transfer event data', async () => {
            const eventData = {
                timestamp: '2023-01-01T00:00:00.000Z',
                nftId: 'nft_123',
                from: 'user1',
                to: 'user2'
            };
            
            // Call createKey with the context and event data components
            const key = NFTTransferEvent.createKey(ctx as unknown as Context, 
                eventData.timestamp, eventData.nftId, eventData.from, eventData.to);
            
            // The key format should be 'nft-transfer-event:<timestamp>:nftId:from:to'
            expect(key).toBe('nft-transfer-event:2023-01-01T00:00:00.000Z:nft_123:user1:user2');
        });
        
        it('should get the key for a transfer event instance', async () => {
            const event = new NFTTransferEvent('user1', 'user2', 'nft_123');
            
            // Set a fixed timestamp for testing
            event.data.timestamp = '2023-01-01T00:00:00.000Z';
            
            const key = event.getKey(ctx as unknown as Context);
            
            // The key format should be 'nft-transfer-event:<timestamp>:nftId:from:to'
            expect(key).toBe('nft-transfer-event:2023-01-01T00:00:00.000Z:nft_123:user1:user2');
        });
    });
    
    describe('putState', () => {
        it('should store the event in the ledger and add a contract event', async () => {
            const event = new NFTTransferEvent('user1', 'user2', 'nft_123');
            
            // Set a fixed timestamp for testing
            event.data.timestamp = '2023-01-01T00:00:00.000Z';
            
            // Add a spy for ContractEvent.addEvent
            jest.spyOn(ContractEvent, 'addEvent').mockImplementation(() => {
                // Explicitly trigger setEvent to simulate what ContractEvent.addEvent would do
                ctx.stub.setEvent('transfer-event', Buffer.from(JSON.stringify(event.data)));
                return;
            });
            
            await event.putState(ctx as unknown as Context);
            
            // Check that createCompositeKey was called with the right components
            expect(ctx.stub.createCompositeKey).toHaveBeenCalledWith(
                'nft-transfer-event',
                ['2023-01-01T00:00:00.000Z', 'nft_123', 'user1', 'user2']
            );
            
            // Check that putState was called
            expect(ctx.stub.putState).toHaveBeenCalled();
            
            // Check that setEvent was called (due to ContractEvent.addEvent)
            expect(ctx.stub.setEvent).toHaveBeenCalled();
        });
    });
}); 