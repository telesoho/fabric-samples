import {
  BaseContractEventHandler,
  IContractEventPayload,
} from './event_handler';
import PgBoss from 'pg-boss';
import {encodeDocumentKey} from '../postgresql_manager';

const NFT_EVENT_TYPE = 'coconiko-nft' as const;
const NFT_TABLE = 'nft';

interface NFTEventJobData {
  id: string;
  eventType: typeof NFT_EVENT_TYPE;
  documentKey: string;
  payload: {
    owner: string;
    creator: string;
    nftId: string;
    name: string;
    price: number;
    description: string;
    image: string;
    metadata: Record<string, any>;
    created: string;
    lastUpdated: string;
    burned: boolean;
  };
}

class NFTEventHandler extends BaseContractEventHandler {
  readonly eventType = NFT_EVENT_TYPE;

  async initializeTables(): Promise<void> {
    try {
      const COCONIKO_SCHEMA = this.pm.COCONIKO_SCHEMA;
      await this.pm.db.none(`
            CREATE TABLE IF NOT EXISTS ${COCONIKO_SCHEMA}.${NFT_TABLE} (
                nft_id TEXT PRIMARY KEY,
                owner TEXT NOT NULL,
                creator TEXT NOT NULL,
                name TEXT NOT NULL,
                price NUMERIC,
                description TEXT,
                image TEXT NOT NULL,
                metadata JSONB NOT NULL,
                burned BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_${COCONIKO_SCHEMA}_${NFT_TABLE}_owner ON ${COCONIKO_SCHEMA}.${NFT_TABLE} (owner);
            CREATE INDEX IF NOT EXISTS idx_${COCONIKO_SCHEMA}_${NFT_TABLE}_creator ON ${COCONIKO_SCHEMA}.${NFT_TABLE} (creator);
      `);
      console.info(`Table '${NFT_TABLE}' initialized for NFT events`);
    } catch (error) {
      console.error(`Failed to initialize table for NFT events`, error);
      throw error;
    }
  }

  public async createOrUpdateNFTEvent(payload: NFTEventJobData['payload']): Promise<void> {
    await this.pm.db.none(
      `INSERT INTO ${this.pm.COCONIKO_SCHEMA}.${NFT_TABLE}
        (nft_id, owner, creator, name, price, description, image, metadata, burned, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (nft_id) DO UPDATE SET
            owner = EXCLUDED.owner,
            creator = EXCLUDED.creator,
            name = EXCLUDED.name,
            price = EXCLUDED.price,
            description = EXCLUDED.description,
            image = EXCLUDED.image,
            burned = EXCLUDED.burned,
            metadata = EXCLUDED.metadata,
            created_at = EXCLUDED.created_at`,
      [
        payload.nftId,
        payload.owner,
        payload.creator,
        payload.name,
        payload.price,
        payload.description,
        payload.image,
        payload.metadata,
        payload.burned,
        payload.created,
      ]
    );
  }

  async handleContractEvent(event: IContractEventPayload): Promise<void> {
    // console.debug("event:", event);
    const nftEvent: NFTEventJobData = {
      id: event.id,
      eventType: NFT_EVENT_TYPE,
      documentKey: encodeDocumentKey(event.key),
      payload: {
        owner: event.payload.owner,
        creator: event.payload.creator,
        nftId: event.payload.id,
        name: event.payload.metadata?.name,
        price: event.payload.metadata?.price,
        description: event.payload.metadata?.description,
        image: event.payload.metadata?.image,
        metadata: event.payload.metadata || {},
        burned: event.payload.burned,
        created: event.payload.created,
        lastUpdated: event.payload.lastUpdated,
      },
    };
    // console.debug("nftEvent:", nftEvent);
    // await this.pm.insertToJob(nftEvent);

    await this.createOrUpdateNFTEvent(nftEvent.payload);
  }

  async handleJobEvent(job: PgBoss.Job<NFTEventJobData>): Promise<void> {
    try {
      const eventData = job.data as NFTEventJobData;
      await this.createOrUpdateNFTEvent(eventData.payload);
    } catch (error) {
      console.error('NFT event handling failed:', error);
      throw error;
    }
  }

  public async syncDocument(document: any): Promise<void> {
    try {
      await this.createOrUpdateNFTEvent({
        nftId: document.id,
        owner: document.owner,
        creator: document.creator,
        name: document.name,
        price: document.price,
        description: document.description,
        image: document.image,
        metadata: document.metadata || {},
        burned: document.burned,
        created: document.created,
        lastUpdated: document.lastUpdated
      });
    } catch (error) {
      console.error('User document sync failed:', error);
      throw new Error(
        `User sync failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

export { NFTEventHandler, NFTEventJobData, NFT_TABLE };
