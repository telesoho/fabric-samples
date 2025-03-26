import { uuid } from './Utils';
import { Context } from 'fabric-contract-api';

// 定义事件对象类型
interface EventData {
  key: string;
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

abstract class ContractEvent {
  eventType: string;
  static events: EventData[] = [];

  constructor(eventType: string) {
    this.eventType = eventType;
  }

  abstract getKey(ctx: Context): string;
  abstract toJSON(): any;

  static initEvents(): void {
    ContractEvent.events = [];
  }

  static addEvent(self: ContractEvent, ctx: Context, payload?: any): void {
    ContractEvent.events.push({
      key: self.getKey(ctx),
      id: uuid(),
      type: self.eventType,
      timestamp: new Date().toISOString(),
      payload: payload || self.toJSON()
    });
  }

  static commitEvents(ctx: Context): void {
    if (ContractEvent.events.length === 0) return;

    const compositeEvent = {
      transactionId: ctx.stub.getTxID(),
      eventCount: ContractEvent.events.length,
      events: ContractEvent.events
    };

    console.debug('Composite event=>', compositeEvent);
    ctx.stub.setEvent(
      'CoconikoContractEvent',
      Buffer.from(JSON.stringify(compositeEvent))
    );
    ContractEvent.initEvents();
  }
}

export { ContractEvent, Context };