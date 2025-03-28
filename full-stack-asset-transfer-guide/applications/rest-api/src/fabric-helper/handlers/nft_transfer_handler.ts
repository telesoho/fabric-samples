import PgBoss from 'pg-boss';
import {
  BaseContractEventHandler,
  IContractEventPayload,
} from './event_handler';
import { encodeDocumentKey } from '../postgresql_manager';

// Add type definitions for event data
const NFT_TRANSFER_EVENT_TYPE = 'nft-transfer-event' as const;
const NFT_TRANSFER_TABLE = 'nft_transfer';

interface NFTTransferEventJobData {
  id: string;
  eventType: typeof NFT_TRANSFER_EVENT_TYPE;
  documentKey: string;
  payload: {
    fromUserId: string;
    toUserId: string;
    nftId: string;
    timestamp: string;
  };
}

class NFTTransferEventHandler extends BaseContractEventHandler {
  readonly eventType = NFT_TRANSFER_EVENT_TYPE;

  async initializeTables(): Promise<void> {
    try {
      const COCONIKO_SCHEMA = this.pm.COCONIKO_SCHEMA;
      await this.pm.db.none(`
            CREATE TABLE IF NOT EXISTS ${COCONIKO_SCHEMA}.${NFT_TRANSFER_TABLE} (
                txid TEXT PRIMARY KEY,
                from_user TEXT NOT NULL,
                to_user TEXT NOT NULL,
                nft_id TEXT NOT NULL,
                event_timestamp TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_${COCONIKO_SCHEMA}_${NFT_TRANSFER_TABLE}_users ON ${COCONIKO_SCHEMA}.${NFT_TRANSFER_TABLE} (from_user, to_user);
        `);
      console.info(`Table '${NFT_TRANSFER_TABLE}' initialized`);
    } catch (error) {
      console.error(`Failed to initialize table ${NFT_TRANSFER_TABLE}`, error);
      throw error;
    }
  }

  public async createOrUpdateTransferEvent(data: {
    fromUserId: string;
    toUserId: string;
    nftId: string;
    timestamp: string;
    documentKey: string;
  }): Promise<void> {
    try {
      await this.pm.db.none(
        `INSERT INTO ${this.pm.COCONIKO_SCHEMA}.${NFT_TRANSFER_TABLE} (txid, from_user, to_user, nft_id, event_timestamp)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (txid) DO UPDATE SET
                    from_user = EXCLUDED.from_user,
                    to_user = EXCLUDED.to_user,
                    nft_id = EXCLUDED.nft_id,
                    event_timestamp = EXCLUDED.event_timestamp
                `,
        [
          encodeDocumentKey(data.documentKey),
          data.fromUserId,
          data.toUserId,
          data.nftId,
          data.timestamp,
        ]
      );
    } catch (error) {
      console.error('Transfer event handling failed:', error);
      throw error;
    }
  }

  async handleJobEvent(job: PgBoss.Job<NFTTransferEventJobData>): Promise<void> {
    try {
      await this.createOrUpdateTransferEvent({
        fromUserId: job.data.payload.fromUserId,
        toUserId: job.data.payload.toUserId,
        nftId: job.data.payload.nftId,
        timestamp: job.data.payload.timestamp,
        documentKey: job.data.documentKey,
      });
    } catch (error) {
      console.error('Transfer event handling failed:', error);
      throw error;
    }
  }

  async handleContractEvent(event: IContractEventPayload): Promise<void> {
    // console.debug(event);
    const transferEvent: NFTTransferEventJobData = {
      id: event.id,
      eventType: NFT_TRANSFER_EVENT_TYPE,
      documentKey: encodeDocumentKey(event.key),
      payload: {
        fromUserId: event.payload.from,
        toUserId: event.payload.to,
        nftId: event.payload.nftId,
        timestamp: event.payload.timestamp,
      },
    };
    // await this.pm.insertToJob(transferEvent);
    await this.createOrUpdateTransferEvent({
      fromUserId: event.payload.from,
      toUserId: event.payload.to,
      nftId: event.payload.nftId,
      timestamp: event.payload.timestamp,
      documentKey: encodeDocumentKey(event.key),
    });
  }

  validatePayload(
    payload: IContractEventPayload
  ): payload is IContractEventPayload {
    return (
      super.validatePayload(payload) &&
      typeof payload.payload.from === 'string' &&
      typeof payload.payload.to === 'string' &&
      typeof payload.payload.nftId === 'string'
    );
  }

  public async syncDocument(document: any): Promise<void> {
    try {
      await this.createOrUpdateTransferEvent({
        fromUserId: document.fromUserId,
        toUserId: document.toUserId,
        nftId: document.nftId,
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
  NFTTransferEventJobData,
  NFTTransferEventHandler,
  NFT_TRANSFER_EVENT_TYPE,
  NFT_TRANSFER_TABLE,
};
