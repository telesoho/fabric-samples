import PgBoss from 'pg-boss';
import {
  BaseContractEventHandler,
  IContractEventPayload,
} from './event_handler';
import { encodeDocumentKey } from '../postgresql_manager';

// Add type definitions for event data
const COIN_TRANSFER_EVENT_TYPE = 'coin-transfer-event' as const;
const COIN_TRANSFER_TABLE = 'transfer';

interface CoinTransferEventJobData {
  id: string;
  eventType: typeof COIN_TRANSFER_EVENT_TYPE;
  documentKey: string;
  payload: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    timestamp: string;
  };
}

class CoinTransferEventHandler extends BaseContractEventHandler {
  readonly eventType = COIN_TRANSFER_EVENT_TYPE;

  async initializeTables(): Promise<void> {
    try {
      const COCONIKO_SCHEMA = this.pm.COCONIKO_SCHEMA;
      await this.pm.db.none(`
            CREATE TABLE IF NOT EXISTS ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE} (
                txid TEXT PRIMARY KEY,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                amount INTEGER NOT NULL,
                event_timestamp TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_${COCONIKO_SCHEMA}_${COIN_TRANSFER_TABLE}_users ON ${COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE} (from_user, to_user);
        `);
      console.info(`Table '${COIN_TRANSFER_TABLE}' initialized`);
    } catch (error) {
      console.error(`Failed to initialize table ${COIN_TRANSFER_TABLE}`, error);
      throw error;
    }
  }

  public async createOrUpdateTransferEvent(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    timestamp: string;
    documentKey: string;
  }): Promise<void> {
    try {
      await this.pm.db.none(
        `INSERT INTO ${this.pm.COCONIKO_SCHEMA}.${COIN_TRANSFER_TABLE} (txid, from_user, to_user, amount, event_timestamp)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (txid) DO UPDATE SET
                    from_user = EXCLUDED.from_user,
                    to_user = EXCLUDED.to_user,
                    amount = EXCLUDED.amount,
                    event_timestamp = EXCLUDED.event_timestamp
                `,
        [
          encodeDocumentKey(data.documentKey),
          data.fromUserId,
          data.toUserId,
          data.amount,
          data.timestamp,
        ]
      );
    } catch (error) {
      console.error('Transfer event handling failed:', error);
      throw error;
    }
  }

  async handleJobEvent(job: PgBoss.Job<CoinTransferEventJobData>): Promise<void> {
    try {
      await this.createOrUpdateTransferEvent({
        fromUserId: job.data.payload.fromUserId,
        toUserId: job.data.payload.toUserId,
        amount: job.data.payload.amount,
        timestamp: job.data.payload.timestamp,
        documentKey: job.data.documentKey,
      });
    } catch (error) {
      console.error('Transfer event handling failed:', error);
      throw error;
    }
  }

  async handleContractEvent(event: IContractEventPayload): Promise<void> {
    // const transferEvent: CoinTransferEventJobData = {
    //   id: event.id,
    //   eventType: COIN_TRANSFER_EVENT_TYPE,
    //   documentKey: encodeDocumentKey(event.key),
    //   payload: {
    //     fromUserId: event.payload.from,
    //     toUserId: event.payload.to,
    //     amount: event.payload.amount,
    //     timestamp: event.payload.timestamp,
    //   },
    // };
    // await this.pm.insertToJob(transferEvent);

    await this.createOrUpdateTransferEvent({
      fromUserId: event.payload.from,
      toUserId: event.payload.to,
      amount: event.payload.amount,
      timestamp: event.payload.timestamp,
      documentKey: encodeDocumentKey(event.key)
    });
  }

  validatePayload(
    payload: IContractEventPayload
  ): payload is IContractEventPayload {
    return (
      super.validatePayload(payload) &&
      typeof payload.payload.from === 'string' &&
      typeof payload.payload.to === 'string' &&
      typeof payload.payload.amount === 'number'
    );
  }

  public async syncDocument(document: any): Promise<void> {
    try {
      await this.createOrUpdateTransferEvent({
        fromUserId: document.fromUserId,
        toUserId: document.toUserId,
        amount: document.amount,
        timestamp: document.timestamp,
        documentKey: document.documentKey,
      });
    } catch (error) {
      console.error('Transfer document sync failed:', error);
      throw new Error(
        `Transfer sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

export {
  CoinTransferEventJobData,
  CoinTransferEventHandler,
  COIN_TRANSFER_EVENT_TYPE,
  COIN_TRANSFER_TABLE,
};
