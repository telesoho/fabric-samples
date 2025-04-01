import { PostgreSQLManager } from '../postgresql_manager';
import { ChaincodeEvent } from '@hyperledger/fabric-gateway';
import { logger } from '../../logger';
import PgBoss from 'pg-boss';

interface IContractEventPayload {
  id: string;
  type: string;
  key: string;
  payload: Record<string, any>;
}

interface IContractEventHandler<T> {
  readonly eventType: string;

  initializeTables(): Promise<void>;

  validatePayload(payload: T): payload is T;

  handleContractEvent(event: T): Promise<void>;

  handleContractError(error: Error, event: ChaincodeEvent): void;

  handleJobEvent(job: PgBoss.Job): Promise<void>;

  syncDocument(doc: any): Promise<void>;
}

abstract class BaseContractEventHandler
  implements IContractEventHandler<IContractEventPayload>
{
  abstract readonly eventType: string;
  protected pm: PostgreSQLManager;

  constructor(pm: PostgreSQLManager) {
    this.pm = pm;
  }

  // Add the abstract handleEvent method
  abstract handleContractEvent(event: IContractEventPayload): Promise<void>;
  abstract syncDocument(doc: any): Promise<void>;

  abstract initializeTables(): Promise<void>;

  validatePayload(
    payload: IContractEventPayload
  ): payload is IContractEventPayload {
    return !!payload?.id && payload?.type === this.eventType;
  }

  handleContractError(error: Error, event: ChaincodeEvent): void {
    logger.error(`Event handling failed for ${this.eventType}`, {
      eventName: event.eventName,
      error: error.message,
    });
  }

  abstract handleJobEvent(job: PgBoss.Job): Promise<void>;
}

export {
  IContractEventHandler,
  BaseContractEventHandler,
  IContractEventPayload,
};
