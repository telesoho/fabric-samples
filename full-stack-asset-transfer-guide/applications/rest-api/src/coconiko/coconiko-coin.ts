import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';

const utf8Decoder = new TextDecoder();

export class CoconikoCoin {
    readonly #contract?: Contract;

    constructor(contract?: Contract) {
        this.#contract = contract;
    }

    /**
     * Register a new user
     * @returns Registration result
     */
    async CreateUserAccount(): Promise<any> {
        try {
            const result = await this.#contract?.submitTransaction('CreateUserAccount');
            return JSON.parse(utf8Decoder.decode(result));
        } catch (error) {
            throw new Error(`Failed to create user account: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get information about a user
     */
    async ClientAccountInfo(): Promise<any> {
        const result = await this.#contract?.evaluateTransaction('ClientAccountInfo');
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Activates or deactivates a user
     */
    async ActiveUser(active: boolean): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'ActiveUser', 
            active.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Mint new coins for a user
     */
    async Mint(amount: number, days: number = 0): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'Mint', 
            amount.toString(), 
            days.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get balances for multiple users
     */
    async BalanceOf(owners: string[]): Promise<any> {
        return Connection.pgManager.balanceOf(owners);
    }

    /**
     * Transfer coins to another user
     */
    async Transfer(toAccountId: string, amount: number): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'Transfer', 
            toAccountId, 
            amount.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Transfer coins from one user to another (admin only)
     */
    async TransferFrom(fromAccountId: string, toAccountId: string, amount: number): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'TransferFrom', 
            fromAccountId, 
            toAccountId, 
            amount.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get total supply of coins
     */
    async getTotalSupply(startDate?: Date, endDate?: Date, activeUserOnly: boolean = true): Promise<any> {
      const total = await Connection.pgManager.getTotalSupply({
        startDate,
        endDate,
        activeUserOnly
      });

      const ret: Record<string, any> = {};
      if(activeUserOnly) {
        ret.totalActiveSupply = total;
      } else {
        ret.totalSupply = total;
      }
      return ret;
    }

    /**
     * Burn expired coins
     */
    async burnExpired(ownerAccountId: string, expirationDate: string): Promise<any> {
        const result = await this.#contract?.submitTransaction(
            'BurnExpired', 
            ownerAccountId, 
            expirationDate
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get transaction event history for a user's account
     */
    async getClientAccountEventHistory(
        startDate?: Date, 
        endDate?: Date, 
        pageSize?: number, 
        skip?: number
    ): Promise<any> {
        const args = [
            startDate?.toISOString()||"",
            endDate?.toISOString()||"",
            pageSize !== undefined ? pageSize.toString() : '',
            skip !== undefined ? skip.toString() : ''
        ];

        // const result = await this.#contract.evaluateTransaction(
        //     'GetClientAccountEventHistory', 
        //     ...args
        // );
        // return JSON.parse(utf8Decoder.decode(result));
        return args;
    }

    /**
     * Get count of transaction events for a user's account
     */
    async getClientAccountEventHistoryCount(
        startDate?: Date, 
        endDate?: Date
    ): Promise<any> {
        const result = await this.#contract?.evaluateTransaction(
            'GetClientAccountEventHistoryCount', 
            startDate?.toISOString() || '',
            endDate?.toISOString() || ''
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get summary information for active users
     */
    async getSummary(startDate?: Date, endDate?: Date): Promise<any> {
        const data = await Connection.pgManager.getUserSummary({
          startDate: startDate,
          endDate: endDate
        })
        const result = {
          totalMinted: data.receivedFromSystem,
          totalUsed: data.spentToOthers
        }
  
        return result;  
    }
}

