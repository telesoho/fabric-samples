
import { Contract } from '@hyperledger/fabric-gateway';
import { TextDecoder } from 'util';


const utf8Decoder = new TextDecoder();

export class OdooUser {
    readonly #contract: Contract;

    constructor(contract: Contract) {
        this.#contract = contract;
    }

    async accountInfo(): Promise<Object> {
        const result = await this.#contract.evaluate('ClientAccountInfo');
        return JSON.parse(utf8Decoder.decode(result));
    }
}

