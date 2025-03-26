import { Context } from 'fabric-contract-api';
import { SystemInfoJSON } from '../types';

/**
 * System information class
 */
class SystemInfo {
    data: SystemInfoJSON;

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'system-info';
    }

    /**
     * Creates a new SystemInfo instance
     * @param data Optional initial data
     */
    constructor(data?: Partial<SystemInfoJSON>) {
        this.data = {
            docType: SystemInfo.docType(),
            totalSupply: data?.totalSupply ?? 0,
            totalActiveSupply: data?.totalActiveSupply ?? 0
        };
    }

    /**
     * Creates a SystemInfo instance from JSON data
     * @param json JSON data
     * @returns A new SystemInfo instance
     */
    static fromJSON(json: Partial<SystemInfoJSON>): SystemInfo {
        if (json.docType !== SystemInfo.docType()) {
            throw new Error(`docType must be ${SystemInfo.docType()}`);
        }
        
        return new SystemInfo({
            docType: json.docType,
            totalSupply: Number(json.totalSupply ?? 0),
            totalActiveSupply: Number(json.totalActiveSupply ?? 0)
        });
    }

    /**
     * Converts the SystemInfo instance to JSON
     * @returns JSON representation of the SystemInfo instance
     */
    toJSON(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Gets the key for SystemInfo
     * @returns The key
     */
    static getKey(): string {
        return SystemInfo.docType();
    }

    /**
     * Creates a SystemInfo instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new SystemInfo instance
     */
    static fromBuffer(buffer: Uint8Array): SystemInfo {
        return SystemInfo.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the SystemInfo instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Gets the system info state from the ledger
     * @param ctx The transaction context
     * @returns The state as a buffer
     */
    static async getState(ctx: Context): Promise<Uint8Array> {
        return ctx.stub.getState(SystemInfo.getKey());
    }

    /**
     * Writes the SystemInfo instance to the ledger
     * @param ctx The transaction context
     * @returns The result of putState
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(SystemInfo.getKey(), this.toBuffer());
    }

    /**
     * Gets a SystemInfo instance from the ledger
     * @param ctx The transaction context
     * @returns A SystemInfo instance
     */
    static async fromState(ctx: Context): Promise<SystemInfo> {
        const state = await this.getState(ctx);
        if (!state || state.length === 0) {
            throw new Error('System info not found in state');
        }
        return SystemInfo.fromJSON(JSON.parse(state.toString()));
    }
}

export { SystemInfo }; 