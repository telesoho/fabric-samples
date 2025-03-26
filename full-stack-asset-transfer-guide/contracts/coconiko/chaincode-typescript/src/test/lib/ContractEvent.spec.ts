import { Context } from 'fabric-contract-api';
import { ContractEvent } from '../../lib/ContractEvent';
import { createMockContext, TestContext } from '../mocks/fabric-mock';

// Create a concrete implementation of ContractEvent for testing
class TestEvent extends ContractEvent {
    public id: string;
    public data: string;

    constructor(id: string, data: string) {
        super('test-event');
        this.id = id;
        this.data = data;
    }

    getKey(ctx: Context): string {
        return `test:${this.id}`;
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            data: this.data
        };
    }
}

describe('ContractEvent', () => {
    let ctx: TestContext;
    let testEvent: TestEvent;

    beforeEach(() => {
        ctx = createMockContext();
        testEvent = new TestEvent('123', 'test data');
        ContractEvent.initEvents();
    });

    describe('initEvents', () => {
        it('should clear events array', () => {
            // Add an event
            ContractEvent.addEvent(testEvent, ctx as unknown as Context);
            
            // Initialize events
            ContractEvent.initEvents();
            
            // Add another event
            const anotherEvent = new TestEvent('456', 'another test');
            ContractEvent.addEvent(anotherEvent, ctx as unknown as Context);
            
            // Commit events - this should only commit the second event
            ContractEvent.commitEvents(ctx as unknown as Context);
            
            // Check that setEvent was called with the correct event
            expect(ctx.stub.setEvent).toHaveBeenCalledTimes(1);
            const eventCall = ctx.stub.setEvent.mock.calls[0];
            expect(eventCall[0]).toBe('CoconikoContractEvent');
            
            const eventData = JSON.parse(eventCall[1].toString());
            expect(eventData.eventCount).toBe(1);
            expect(eventData.events[0].key).toBe('test:456');
        });
    });

    describe('addEvent', () => {
        it('should add an event to the events array', () => {
            ContractEvent.addEvent(testEvent, ctx as unknown as Context);
            
            // Add with custom payload
            const customPayload = { custom: 'payload' };
            ContractEvent.addEvent(testEvent, ctx as unknown as Context, customPayload);
            
            // Commit events
            ContractEvent.commitEvents(ctx as unknown as Context);
            
            // Check that setEvent was called with the correct events
            expect(ctx.stub.setEvent).toHaveBeenCalledTimes(1);
            const eventCall = ctx.stub.setEvent.mock.calls[0];
            expect(eventCall[0]).toBe('CoconikoContractEvent');
            
            const eventData = JSON.parse(eventCall[1].toString());
            expect(eventData.eventCount).toBe(2);
            
            // First event should use the event's toJSON method
            expect(eventData.events[0].key).toBe('test:123');
            expect(eventData.events[0].type).toBe('test-event');
            expect(eventData.events[0].payload).toEqual({ id: '123', data: 'test data' });
            
            // Second event should use the custom payload
            expect(eventData.events[1].key).toBe('test:123');
            expect(eventData.events[1].type).toBe('test-event');
            expect(eventData.events[1].payload).toEqual(customPayload);
        });
    });

    describe('commitEvents', () => {
        it('should do nothing when events array is empty', () => {
            ContractEvent.commitEvents(ctx as unknown as Context);
            expect(ctx.stub.setEvent).not.toHaveBeenCalled();
        });
        
        it('should commit events to the ledger', () => {
            ContractEvent.addEvent(testEvent, ctx as unknown as Context);
            ContractEvent.commitEvents(ctx as unknown as Context);
            
            // Check that setEvent was called with the correct event
            expect(ctx.stub.setEvent).toHaveBeenCalledTimes(1);
            const eventCall = ctx.stub.setEvent.mock.calls[0];
            expect(eventCall[0]).toBe('CoconikoContractEvent');
            
            const eventData = JSON.parse(eventCall[1].toString());
            expect(eventData.transactionId).toBeDefined();
            expect(eventData.eventCount).toBe(1);
            expect(eventData.events[0].key).toBe('test:123');
            expect(eventData.events[0].type).toBe('test-event');
            expect(eventData.events[0].id).toBeDefined();
            expect(eventData.events[0].timestamp).toBeDefined();
            expect(eventData.events[0].payload).toEqual({ id: '123', data: 'test data' });
        });
        
        it('should clear events array after committing', () => {
            ContractEvent.addEvent(testEvent, ctx as unknown as Context);
            ContractEvent.commitEvents(ctx as unknown as Context);
            
            // Reset the mock to check that it's not called again
            ctx.stub.setEvent.mockClear();
            
            // Call commitEvents again - it should not commit anything
            ContractEvent.commitEvents(ctx as unknown as Context);
            expect(ctx.stub.setEvent).not.toHaveBeenCalled();
        });
    });
}); 