import { Context } from 'fabric-contract-api';
import { uid } from './Utils';
import { ContractEventData } from '../types';

/**
 * Base class for all contract events
 */
export class ContractEvent {
    protected eventType: string;
    private static events: ContractEventData[] = [];

    /**
     * Creates a new ContractEvent
     * @param eventType Type of the event
     */
    constructor(eventType: string) {
        this.eventType = eventType;
    }

    /**
     * Gets the key for this contract event
     * @param ctx The transaction context
     * @returns The key string
     */
    getKey(ctx: Context): string {
        throw new Error('Unimplemented');
    }

    /**
     * Converts the contract event to a JSON object
     * @returns JSON representation of the contract event
     */
    toJSON(): Record<string, unknown> {
        throw new Error('Unimplemented');
    }

    /**
     * Initializes the events array
     */
    static initEvents(): void {
        ContractEvent.events = [];
    }

    /**
     * Adds an event to the events array
     * @param self The contract event
     * @param ctx The transaction context
     * @param payload Optional custom payload
     */
    static addEvent(self: ContractEvent, ctx: Context, payload?: Record<string, unknown>): void {
        ContractEvent.events.push({
            key: self.getKey(ctx),
            id: uid(),
            type: self.eventType,
            timestamp: new Date().toISOString(),
            payload: payload || self.toJSON()
        });
    }

    /**
     * Commits all events to the ledger
     * @param ctx The transaction context
     */
    static commitEvents(ctx: Context): void {
        if (ContractEvent.events.length === 0) {
            return;
        }

        const compositeEvent = {
            transactionId: ctx.stub.getTxID(),
            eventCount: ContractEvent.events.length,
            events: ContractEvent.events
        };

        console.debug('Composite event=>', compositeEvent);
        ctx.stub.setEvent('CoconikoContractEvent', Buffer.from(JSON.stringify(compositeEvent)));
        ContractEvent.initEvents();
    }
} 