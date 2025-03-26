import { Context } from 'fabric-contract-api';
import { uid } from '../Utils';
import { GovernanceTokenJSON } from '../../types';

export class GovernanceToken {
    public docType: string;
    public id: string;
    public owner: string;
    public amount: number;
    public created: string;

    static docType(): string {
        return 'coconiko-governance-token';
    }

    constructor(owner?: string, amount?: number) {
        this.docType = GovernanceToken.docType();
        this.id = `gtoken_${uid()}`;
        this.owner = owner || '';
        this.amount = amount || 0;
        this.created = new Date().toISOString();
    }

    static fromJSON(json: GovernanceTokenJSON): GovernanceToken {
        if (json.docType !== GovernanceToken.docType()) {
            throw new Error(`docType must be ${GovernanceToken.docType()}`);
        }
        const obj = new GovernanceToken();
        Object.assign(obj, {
            id: json.id,
            owner: json.owner,
            amount: json.amount,
            created: json.created
        });
        return obj;
    }

    toJSON(): GovernanceTokenJSON {
        return {
            docType: this.docType,
            id: this.id,
            owner: this.owner,
            amount: this.amount,
            created: this.created
        };
    }

    static fromBuffer(buffer: Buffer | Uint8Array): GovernanceToken {
        return GovernanceToken.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer(): Buffer {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static createKey(ctx: Context, tokenId: string): string {
        return ctx.stub.createCompositeKey(GovernanceToken.docType(), [tokenId]);
    }

    getKey(ctx: Context): string {
        return GovernanceToken.createKey(ctx, this.id);
    }

    async removeState(ctx: Context): Promise<void> {
        return await ctx.stub.deleteState(this.getKey(ctx));
    }

    async putState(ctx: Context): Promise<void> {
        return await ctx.stub.putState(this.getKey(ctx), this.toBuffer());
    }

    static async fromState(ctx: Context, tokenId: string): Promise<GovernanceToken> {
        const key = GovernanceToken.createKey(ctx, tokenId);
        const bufBytes = await ctx.stub.getState(key);
        if (!bufBytes || bufBytes.length === 0) {
            throw new Error('GovernanceToken not found');
        }
        return GovernanceToken.fromBuffer(bufBytes);
    }
} 