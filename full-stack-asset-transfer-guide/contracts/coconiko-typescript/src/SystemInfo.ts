import { Context } from 'fabric-contract-api';


interface SystemInfoJSON {
  docType: string;
  totalSupply: number;
  totalActiveSupply: number;
}

class SystemInfo {
  docType: string;
  totalSupply: number;
  totalActiveSupply: number;

  static docType(): string {
    return 'system-info';
  }

  constructor() {
    this.docType = SystemInfo.docType();
    this.totalSupply = 0;
    this.totalActiveSupply = 0;
  }

  static fromJSON(json: SystemInfoJSON): SystemInfo {
    if (json.docType !== SystemInfo.docType()) {
      throw new Error(`docType must be ${SystemInfo.docType()}`);
    }
    
    const obj = new SystemInfo();
    Object.assign(obj, {
      docType: json.docType,
      totalSupply: Number(json.totalSupply),
      totalActiveSupply: Number(json.totalActiveSupply)
    });
    return obj;
  }

  toJSON(): SystemInfoJSON {
    return {
      docType: this.docType,
      totalSupply: this.totalSupply,
      totalActiveSupply: this.totalActiveSupply
    };
  }

  static getKey(): string {
    return SystemInfo.docType();
  }

  static fromBuffer(buffer: Buffer): SystemInfo {
    return SystemInfo.fromJSON(JSON.parse(buffer.toString()));
  }

  toBuffer(): Buffer {
    return Buffer.from(JSON.stringify(this.toJSON()));
  }

  static async getState(ctx: Context): Promise<Uint8Array> {
    return ctx.stub.getState(SystemInfo.getKey());
  }

  async putState(ctx: Context): Promise<void> {
    await ctx.stub.putState(SystemInfo.getKey(), this.toBuffer());
  }

  static async fromState(ctx: Context): Promise<SystemInfo> {
    const state = await this.getState(ctx);
    if (!state || state.length === 0) {
      throw new Error('System info not found in state');
    }
    return SystemInfo.fromJSON(JSON.parse(state.toString()));
  }
}

export { SystemInfo, type SystemInfoJSON };