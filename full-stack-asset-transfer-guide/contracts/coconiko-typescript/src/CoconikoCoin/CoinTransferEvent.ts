import { ContractEvent } from '../ConstractEvent';
import { Context } from 'fabric-contract-api';

// 定义JSON序列化接口
interface CoinTransferEventJSON {
  docType: string;
  from: string;
  to: string;
  amount: number;
  expirationDate: string | null;
  timestamp: string;
}

class CoinTransferEvent extends ContractEvent {
  docType: string;
  from: string;
  to: string;
  amount: number;
  expirationDate: string | null;
  timestamp: string;

  static docType(): string {
    return 'coin-transfer-event';
  }

  constructor(
    from: string = '',
    to: string = '',
    amount: number = 0,
    expirationDate: string | null = null
  ) {
    super(CoinTransferEvent.docType());
    this.docType = CoinTransferEvent.docType();
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.expirationDate = expirationDate;
    this.timestamp = new Date().toISOString();
  }

  static fromJSON(json: Partial<CoinTransferEventJSON>): CoinTransferEvent {
    if (json.docType !== CoinTransferEvent.docType()) {
      throw new Error(`docType must be ${CoinTransferEvent.docType()}`);
    }

    const obj = new CoinTransferEvent();
    Object.assign(obj, {
      docType: json.docType,
      from: json.from ?? '',
      to: json.to ?? '',
      amount: Number(json.amount ?? 0),
      expirationDate: json.expirationDate ?? null,
      timestamp: json.timestamp ?? new Date().toISOString()
    });
    return obj;
  }

  toJSON(): CoinTransferEventJSON {
    return {
      docType: this.docType,
      from: this.from,
      to: this.to,
      amount: this.amount,
      expirationDate: this.expirationDate,
      timestamp: this.timestamp
    };
  }

  static createKey(
    ctx: Context,
    timestamp: string,
    from: string,
    to: string
  ): string {
    return ctx.stub.createCompositeKey(CoinTransferEvent.docType(), [
      timestamp,
      from,
      to
    ]);
  }

  getKey(ctx: Context): string {
    return CoinTransferEvent.createKey(ctx, this.timestamp, this.from, this.to);
  }

  static fromBuffer(buffer: Uint8Array): CoinTransferEvent {
    return CoinTransferEvent.fromJSON(JSON.parse(buffer.toString()));
  }

  toBuffer(): Buffer {
    return Buffer.from(JSON.stringify(this.toJSON()));
  }

  async putState(ctx: Context): Promise<void> {
    await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    ContractEvent.addEvent(this, ctx, this.toJSON());
  }
}

export { CoinTransferEvent, type CoinTransferEventJSON };