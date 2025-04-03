import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';
import { Connection } from '../connection';

const utf8Decoder = new TextDecoder();

export class CoconikoDebug {
    readonly #contract: Contract;

    constructor(contract?: Contract) {
        if (!contract) {
            this.#contract = Connection.coconikoCoinContract;
        } else {
            this.#contract = contract;
        }
    }

    /**
     * Query assets with pagination
     */
    async queryAssetsWithPagination(query: any, pageSize: number, bookmark: string = ""): Promise<any> {
        const result = await this.#contract.evaluateTransaction(
            'queryAssetsWithPagination',
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
        return await Connection.pgManager.select(queryString, params);
    }
}

