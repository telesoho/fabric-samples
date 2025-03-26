import { Context } from 'fabric-contract-api';
import { ContractEvent } from './ContractEvent';
import { UserInfoJSON } from '../types';

/**
 * User information class
 */
class UserInfo extends ContractEvent {
    data: UserInfoJSON;

    /**
     * Gets the document type
     * @returns The document type string
     */
    static docType(): string {
        return 'user-info';
    }

    /**
     * Creates a new UserInfo instance
     * @param data User information data or parameters for initialization
     */
    constructor(data: UserInfoJSON | {
        userId?: string,
        accountId?: string,
        role?: string,
        balance?: number,
        active?: boolean
    }) {
        super(UserInfo.docType());

        if ((data as UserInfoJSON).docType) {
            // Data is already a UserInfoJSON object
            this.data = data as UserInfoJSON;
        } else {
            // We need to construct the UserInfoJSON object
            const params = data as {
                userId?: string,
                accountId?: string,
                role?: string,
                balance?: number,
                active?: boolean
            };
            const now = new Date().toISOString();
            
            this.data = {
                docType: UserInfo.docType(),
                userId: params.userId ?? '',
                accountId: params.accountId ?? '',
                role: params.role ?? '',
                balance: params.balance ?? 0,
                active: params.active ?? true,
                nfts: [],
                created: now,
                updated: now
            };
        }
    }

    /**
     * Creates a UserInfo instance from JSON data
     * @param json JSON data
     * @returns A new UserInfo instance
     */
    static fromJSON(json: Partial<UserInfoJSON>): UserInfo {
        if (json.docType !== UserInfo.docType()) {
            throw new Error(`docType must be ${UserInfo.docType()}`);
        }

        // Ensure all required properties exist
        const userInfoData: UserInfoJSON = {
            docType: json.docType ?? UserInfo.docType(),
            userId: json.userId ?? '',
            accountId: json.accountId ?? '',
            role: json.role ?? '',
            balance: Number(json.balance ?? 0),
            active: typeof json.active === 'boolean' ? json.active : json.active === 'true',
            nfts: Array.isArray(json.nfts) ? [...json.nfts] : [],
            created: json.created ?? new Date().toISOString(),
            updated: json.updated ?? new Date().toISOString()
        };

        return new UserInfo(userInfoData);
    }

    /**
     * Converts the UserInfo instance to JSON
     * @returns JSON representation of the UserInfo instance
     */
    toJSON(): Record<string, unknown> {
        return this.data;
    }

    /**
     * Creates a composite key for a user
     * @param ctx The transaction context
     * @param accountId The account ID
     * @returns The composite key
     */
    static createKey(ctx: Context, accountId: string): string {
        return ctx.stub.createCompositeKey(UserInfo.docType(), [accountId]);
    }

    /**
     * Gets the key for this UserInfo instance
     * @param ctx The transaction context
     * @returns The key
     */
    getKey(ctx: Context): string {
        return UserInfo.createKey(ctx, this.data.accountId);
    }

    /**
     * Creates a UserInfo instance from a buffer
     * @param buffer Buffer containing JSON data
     * @returns A new UserInfo instance
     */
    static fromBuffer(buffer: Uint8Array): UserInfo {
        return UserInfo.fromJSON(JSON.parse(buffer.toString()));
    }

    /**
     * Converts the UserInfo instance to a buffer
     * @returns Buffer containing JSON data
     */
    toBuffer(): Uint8Array {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    /**
     * Writes the UserInfo instance to the ledger
     * @param ctx The transaction context
     * @returns The result of putState
     */
    async putState(ctx: Context): Promise<void> {
        await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
        ContractEvent.addEvent(this, ctx);
    }

    /**
     * Adds an NFT to the user's NFT list
     * @param nftId The NFT ID to add
     */
    addNFT(nftId: string): void {
        if (!this.data.nfts.includes(nftId)) {
            this.data.nfts.push(nftId);
            this.data.updated = new Date().toISOString();
        }
    }

    /**
     * Removes an NFT from the user's NFT list
     * @param nftId The NFT ID to remove
     */
    removeNFT(nftId: string): void {
        const initialLength = this.data.nfts.length;
        this.data.nfts = this.data.nfts.filter(id => id !== nftId);
        if (this.data.nfts.length !== initialLength) {
            this.data.updated = new Date().toISOString();
        }
    }

    /**
     * Gets a UserInfo instance from the ledger
     * @param ctx The transaction context
     * @param accountId The account ID
     * @returns A UserInfo instance
     */
    static async fromState(ctx: Context, accountId: string): Promise<UserInfo> {
        const key = UserInfo.createKey(ctx, accountId);
        const userInfoBufBytes = await ctx.stub.getState(key);
        
        if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
            throw new Error('User info not found');
        }
        
        return UserInfo.fromBuffer(userInfoBufBytes);
    }

    /**
     * Creates a new user account
     * @param ctx The transaction context
     * @returns A new UserInfo instance
     */
    static async createUserAccount(ctx: Context): Promise<UserInfo> {
        const userInfo = new UserInfo({
            userId: ctx.clientIdentity.getAttributeValue('username') ?? '',
            accountId: ctx.clientIdentity.getID(),
            role: ctx.clientIdentity.getAttributeValue('role') ?? ''
        });
        
        await userInfo.putState(ctx);
        return userInfo;
    }

    /**
     * Gets or creates the current user account
     * @param ctx The transaction context
     * @returns A UserInfo instance
     */
    static async getOrCreateCurrentUserAccount(ctx: Context): Promise<UserInfo> {
        const accountId = ctx.clientIdentity.getID();
        const key = UserInfo.createKey(ctx, accountId);
        const userInfoBufBytes = await ctx.stub.getState(key);

        if (!userInfoBufBytes || userInfoBufBytes.length === 0) {
            return await UserInfo.createUserAccount(ctx);
        }
        
        return UserInfo.fromBuffer(userInfoBufBytes);
    }
}

export { UserInfo }; 