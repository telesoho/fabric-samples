'use strict';
const { uuid } = require('./Utils.js');


class ContractEvent {

    constructor(eventType) {
        this.eventType = eventType;
    }

    getKey(ctx) {
        throw new Error('Unimplement');
    }

    toJSON() {
        throw new Error('Unimplement');
    }

    static initEvents() {
        ContractEvent.events = [];
    }

    static addEvent(self, ctx, payload) {
        ContractEvent.events.push({
            key: self.getKey(ctx),
            id: uuid(),
            type: self.eventType,
            timestamp: new Date().toISOString(),
            payload: payload || self.toJSON()
        });
    }

    // see: https://github.com/hyperledger/fabric-chaincode-node/blob/c2a99c1426daaf03a1aa1355da5c6f0a04f53d08/libraries/fabric-shim/lib/stub.js#L764
    // NOTE: If setEvent() is called multiple times only the last event will be included in the transaction.
    // So we need commitEvents at last.
    static commitEvents(ctx) {
        if (ContractEvent.events.length === 0) {return;}

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

ContractEvent.events = [];

module.exports = { ContractEvent };