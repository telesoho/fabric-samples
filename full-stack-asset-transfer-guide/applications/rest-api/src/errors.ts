import { logger } from './logger';

export class UserExistsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UserExistsError.prototype);

    this.name = 'UserExistsError';
  }
}

/**
 * Base type for errors from the smart contract.
 *
 * These errors will not be retried.
 */
export class ContractError extends Error {
  transactionId: string;

  constructor(message: string, transactionId: string) {
    super(message);
    Object.setPrototypeOf(this, ContractError.prototype);

    this.name = 'TransactionError';
    this.transactionId = transactionId;
  }
}

/**
 * Represents the error which occurs when the transaction being submitted or
 * evaluated is not implemented in a smart contract.
 */
export class TransactionNotFoundError extends ContractError {
  constructor(message: string, transactionId: string) {
    super(message, transactionId);
    Object.setPrototypeOf(this, TransactionNotFoundError.prototype);

    this.name = 'TransactionNotFoundError';
  }
}

/**
 * Represents the error which occurs in the basic asset transfer smart contract
 * implementation when an asset already exists.
 */
export class AssetExistsError extends ContractError {
  constructor(message: string, transactionId: string) {
    super(message, transactionId);
    Object.setPrototypeOf(this, AssetExistsError.prototype);

    this.name = 'AssetExistsError';
  }
}

/**
 * Represents the error which occurs in the basic asset transfer smart contract
 * implementation when an asset does not exist.
 */
export class AssetNotFoundError extends ContractError {
  constructor(message: string, transactionId: string) {
    super(message, transactionId);
    Object.setPrototypeOf(this, AssetNotFoundError.prototype);

    this.name = 'AssetNotFoundError';
  }
}
