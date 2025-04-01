import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';
import { logger } from '../logger';
import * as config from '../config';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as https from 'https';

const utf8Decoder = new TextDecoder();

export class CoconikoCoin {
    readonly #contract: Contract;

    constructor(contract?: Contract) {
        if (!contract) {
            this.#contract = Connection.coconikoCoinContract;
        } else {
            this.#contract = contract;
        }
    }

    /**
     * Register a new user
     * @param username User identifier
     * @param role User role (client, admin, etc.)
     * @returns Registration result
     */
    async registerUser(username: string, role: string): Promise<any> {
        try {
            logger.info(`Registering user ${username} with role ${role}`);

            // TODO: Use Fabric CA REST API to implement the registration logic
            // 1. Register the user with Fabric CA
            // 2. Enroll the user with Fabric CA
            // 3. Save the user's certificate and private key to the wallet
            // 4. Return the user ID and MSP ID
            
            return {
                success: true,
                userId: username,
                role: role,
                // mspId: mspId,
                walletCreated: true,
                message: 'User registered and enrolled successfully',
            };
        } catch (error) {
            logger.error(`Failed to register user ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to register user: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get information about a user
     */
    async getUserInfo(userId: string): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetUserInfo', 
            userId
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Update user information
     */
    async updateUser(userId: string, active: boolean): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'UpdateUser', 
            userId, 
            active.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Mint new coins for a user
     */
    async mintCoin(userId: string, amount: number, days: number = 0): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'MintCoin', 
            userId, 
            amount.toString(), 
            days.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get balances for multiple users
     */
    async getBalances(owners: string[]): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetBalances', 
            JSON.stringify(owners)
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Transfer coins to another user
     */
    async transfer(fromUserId: string, toAccountId: string, amount: number): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'Transfer', 
            fromUserId, 
            toAccountId, 
            amount.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Transfer coins from one user to another (admin only)
     */
    async transferFrom(adminUserId: string, fromAccountId: string, toAccountId: string, amount: number): Promise<any> {
        const result = await this.#contract.submitTransaction(
            'TransferFrom', 
            adminUserId,
            fromAccountId, 
            toAccountId, 
            amount.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get total supply of coins
     */
    async getTotalSupply(startDate?: string, endDate?: string, activeUserOnly: boolean = true): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetTotalSupply', 
            startDate || '', 
            endDate || '', 
            activeUserOnly.toString()
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Burn expired coins
     */
    async burnExpired(ownerAccountId: string, expirationDate: string): Promise<any> {
        const result = await this.#contract.submitTransaction(
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
        userId: string, 
        startDate?: string, 
        endDate?: string, 
        pageSize?: number, 
        skip?: number
    ): Promise<any> {
        const args = [
            userId,
            startDate || '',
            endDate || '',
            pageSize !== undefined ? pageSize.toString() : '',
            skip !== undefined ? skip.toString() : ''
        ];
        
        const result = await this.#contract.evaluateTransaction(
            'GetClientAccountEventHistory', 
            ...args
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get count of transaction events for a user's account
     */
    async getClientAccountEventHistoryCount(
        userId: string, 
        startDate?: string, 
        endDate?: string
    ): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetClientAccountEventHistoryCount', 
            userId,
            startDate || '',
            endDate || ''
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Get summary information for active users
     */
    async getSummary(startDate?: string, endDate?: string): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'GetSummary', 
            startDate || '', 
            endDate || ''
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Query assets with pagination
     */
    async queryAssetsWithPagination(query: any, pageSize: number, bookmark: string = ""): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'QueryAssetsWithPagination', 
            JSON.stringify(query), 
            pageSize.toString(), 
            bookmark
        );
        return JSON.parse(utf8Decoder.decode(result));
    }

    /**
     * Execute PostgreSQL query (SELECT only)
     */
    async executePostgresQuery(queryString: string, params: any = {}): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'ExecutePostgresQuery', 
            queryString, 
            JSON.stringify(params)
        );
        return JSON.parse(utf8Decoder.decode(result));
    }
}

