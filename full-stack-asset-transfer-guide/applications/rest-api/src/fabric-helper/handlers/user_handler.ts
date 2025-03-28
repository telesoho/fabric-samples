import { BaseContractEventHandler,IContractEventPayload } from './event_handler';
import {encodeDocumentKey} from '../postgresql_manager';
import PgBoss from 'pg-boss';

const USER_INFO_EVENT_TYPE = 'user-info' as const;
const USER_TABLE = 'user_info';

interface UserEventJobData {
  id: string;
  eventType: typeof USER_INFO_EVENT_TYPE;
  documentKey: string;
  payload : {
    userId: string;
    role: string;
    accountId: string;
    active: boolean;
    balance?: number;  
  }
}

class UserInfoEventHandler extends BaseContractEventHandler {
  readonly eventType = USER_INFO_EVENT_TYPE;

  async initializeTables(): Promise<void> {
    try {
      const COCONIKO_SCHEMA = this.pm.COCONIKO_SCHEMA;
      await this.pm.db.none(`
            CREATE TABLE IF NOT EXISTS ${COCONIKO_SCHEMA}.${USER_TABLE} (
                account_id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                balance INTEGER NOT NULL DEFAULT 0, 
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO ${COCONIKO_SCHEMA}.${USER_TABLE} (account_id, user_id, role, active)
            SELECT '0x0', 'system', 'admin', false
            WHERE NOT EXISTS (SELECT 1 FROM ${COCONIKO_SCHEMA}.${USER_TABLE} WHERE account_id = '0x0');

            CREATE INDEX IF NOT EXISTS idx_${COCONIKO_SCHEMA}_${USER_TABLE}_active ON ${COCONIKO_SCHEMA}.${USER_TABLE} (active);
        `);
      console.info(
        `Table '${USER_TABLE}' initialized for ${USER_INFO_EVENT_TYPE} events`
      );
    } catch (error) {
      console.error(
        `Failed to initialize '${USER_TABLE}' table for ${USER_INFO_EVENT_TYPE} events`,
        error
      );
      throw error;
    }
  }

  public async createOrUpdateUser(userData: {
    userId: string;
    role: string;
    accountId: string;
    active: boolean;
    balance?: number;
  }): Promise<void> {
    try {
      const COCONIKO_SCHEMA = this.pm.COCONIKO_SCHEMA;
      await this.pm.db.none(
        `INSERT INTO ${COCONIKO_SCHEMA}.${USER_TABLE} (account_id, user_id, role, active, balance)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (account_id) DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    role = EXCLUDED.role,
                    active = EXCLUDED.active,
                    balance = EXCLUDED.balance,
                    updated_at = CURRENT_TIMESTAMP`,
        [
          userData.accountId,
          userData.userId,
          userData.role,
          userData.active,
          userData.balance || 0,
        ]
      );
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('User creation failed');
    }
  }

  public async handleJobEvent(job: PgBoss.Job<UserEventJobData>): Promise<void> {
    try {
      await this.createOrUpdateUser({
        userId: job.data.payload.userId,
        role: job.data.payload.role,
        accountId: job.data.payload.accountId,
        active: job.data.payload.active,
        balance: job.data.payload.balance,
      });
    } catch (error) {
      console.error('User event handling failed:', error);
      throw error;
    }
  }

  async handleContractEvent(event: IContractEventPayload): Promise<void> {
    // const userEvent: UserEventJobData = {
    //   id: event.id,
    //   eventType: USER_INFO_EVENT_TYPE,
    //   documentKey: encodeDocumentKey(event.key),
    //   payload: {
    //     userId: event.payload.userId,
    //     role: event.payload.role,
    //     accountId: event.payload.accountId,
    //     active: event.payload.active,
    //     balance: event.payload.balance
    //   }
    // };
    // await this.pm.insertToJob(userEvent);

    await this.createOrUpdateUser({
      userId: event.payload.userId,
      role: event.payload.role,
      accountId: event.payload.accountId,
      active: event.payload.active,
      balance: event.payload.balance
    });
  }

  public async syncDocument(document: any): Promise<void> {
    try {
      await this.createOrUpdateUser({
        userId: document.userId,
        role: document.role,
        accountId: document.accountId,
        active: document.active,
        balance: document.balance || 0
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

export { UserInfoEventHandler, UserEventJobData, USER_TABLE, USER_INFO_EVENT_TYPE };
