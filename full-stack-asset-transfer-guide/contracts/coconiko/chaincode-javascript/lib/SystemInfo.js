'use strict';

class SystemInfo {
    static docType() {
        return 'system-info';
    }

    constructor() {
        this.docType = SystemInfo.docType();
        this.totalSupply = 0;
        this.totalActiveSupply = 0;
    }

    static fromJSON(json) {
        if(json.docType !== SystemInfo.docType()) {
            throw new Error(`docType must be ${SystemInfo.docType()}`);
        }
        const obj = new SystemInfo();
        Object.assign(obj, {
            docType: json.docType,
            totalSupply: json.totalSupply,
            totalActiveSupply: json.totalActiveSupply
        });
        return obj;
    }

    toJSON() {
        return {
            docType: this.docType,
            totalSupply: this.totalSupply,
            totalActiveSupply: this.totalActiveSupply
        };
    }

    static getKey() {
        return SystemInfo.docType();
    }

    static fromBuffer(buffer) {
        return SystemInfo.fromJSON(JSON.parse(buffer.toString()));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this.toJSON()));
    }

    static async getState(ctx) {
        return await ctx.stub.getState(SystemInfo.getKey());
    }

    async putState(ctx) {
        return await ctx.stub.putState(SystemInfo.getKey(), this.toBuffer());
    }

    static async fromState(ctx) {
        const state = await this.getState(ctx);
        return SystemInfo.fromJSON(JSON.parse(state.toString()));
    }
}

module.exports = { SystemInfo };