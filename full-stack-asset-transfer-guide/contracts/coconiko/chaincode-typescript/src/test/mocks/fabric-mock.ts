import { mockDeep, MockProxy } from 'jest-mock-extended';

// These types are not directly exported from fabric-contract-api
// but we can define interfaces that match their essential structure
export interface ClientIdentity {
    getID(): string;
    getMSPID(): string;
    getAttributeValue(name: string): string;
    assertAttributeValue(name: string, value: string): boolean;
}

export interface ChaincodeStub {
    getArgs(): string[];
    getStringArgs(): string[];
    getFunctionAndParameters(): { fcn: string; params: string[] };
    getTxID(): string;
    getChannelID(): string;
    getState(key: string): Promise<Uint8Array>;
    putState(key: string, value: Uint8Array): Promise<void>;
    deleteState(key: string): Promise<void>;
    getStateByRange(startKey: string, endKey: string): Promise<any>;
    getStateByPartialCompositeKey(objectType: string, attributes: string[]): Promise<any>;
    createCompositeKey(objectType: string, attributes: string[]): string;
    setEvent(name: string, payload: Uint8Array): void;
}

export class TestContext {
    clientIdentity: MockProxy<ClientIdentity>;
    stub: MockProxy<ChaincodeStub>;
    logger: Console;
    logging = {
        getLogger: (name: string) => console
    };

    constructor() {
        this.clientIdentity = mockDeep<ClientIdentity>();
        this.stub = mockDeep<ChaincodeStub>();
        this.logger = console;
    }
}

export function createMockContext(): TestContext {
    const context = new TestContext();
    
    // Default implementation for common methods
    context.stub.getState.mockImplementation((key: string) => {
        return Promise.resolve(Buffer.from(''));
    });
    
    context.stub.putState.mockImplementation((key: string, value: Uint8Array) => {
        return Promise.resolve();
    });
    
    context.stub.deleteState.mockImplementation((key: string) => {
        return Promise.resolve();
    });
    
    context.stub.getTxID.mockImplementation(() => {
        return 'mock-tx-id-' + Math.floor(Math.random() * 1000);
    });

    context.stub.createCompositeKey.mockImplementation((objectType: string, attributes: string[]) => {
        return `${objectType}:${attributes.join(':')}`;
    });
    
    context.clientIdentity.getID.mockImplementation(() => {
        return 'x509::/CN=mockUser::/CN=mockOrg';
    });
    
    context.clientIdentity.getMSPID.mockImplementation(() => {
        return 'mockMSP';
    });
    
    return context;
}

export function setStateAsBuffer(context: TestContext, key: string, value: any): void {
    context.stub.getState.mockImplementation((requestedKey: string) => {
        if (requestedKey === key) {
            return Promise.resolve(Buffer.from(JSON.stringify(value)));
        }
        return Promise.resolve(Buffer.from(''));
    });
}

export function expectStateToMatch(context: TestContext, expectedKey: string, expectedValue: any): void {
    expect(context.stub.putState).toHaveBeenCalledWith(
        expectedKey,
        expect.any(Buffer)
    );
    
    // Find the actual call to putState with this key
    const calls = context.stub.putState.mock.calls;
    let found = false;
    
    for (const call of calls) {
        if (call[0] === expectedKey) {
            const actualValue = JSON.parse(call[1].toString());
            expect(actualValue).toEqual(expect.objectContaining(expectedValue));
            found = true;
            break;
        }
    }
    
    if (!found) {
        throw new Error(`No putState call found with key: ${expectedKey}`);
    }
} 