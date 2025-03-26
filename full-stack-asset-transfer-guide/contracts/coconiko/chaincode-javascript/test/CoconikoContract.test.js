'use strict';
const { Context } = require('fabric-contract-api');
const { CoconikoCoin } = require('../lib/CoconikoCoin/CoconikoCoin');
const { CoconikoCoinContract, orgMSPID } = require('../lib/CoconikoCoin/CoconikoCoinContract');
const { ChaincodeStub, ClientIdentity } = require('fabric-shim');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const { CoinTransferEvent } = require('../lib/CoconikoCoin/CoinTransferEvent');
const expect = chai.expect;


chai.should();
chai.use(chaiAsPromised);

// Helpers

function queryStateForIteratror(state, keyStart) {
    const ret = Object.entries(state)
        .filter((e) => (e[0].startsWith(keyStart)))
        .map((e) => {
            return {
                key: e[0],
                value: Buffer.from(e[1])
            };
        });
    console.debug('queryStateForIteratror:', ret);
    return ret;
}


function createCompositeKeyFake(objectType, attributes) {
    return `${objectType}#${attributes.join('#')}`;
}


class MockIterator {
    constructor(data) {
        this.array = data;
        this.cur = 0;
    }
    next() {
        if (this.cur < this.array.length) {
            const value = this.array[this.cur];
            this.cur++;
            return Promise.resolve({ value: value });
        } else {
            return Promise.resolve({ done: true });
        }
    }
    close() {
        return Promise.resolve();
    }
}

// Tests
describe('CoconikoCoinContract', () => {

    let sandbox;
    let ctx;
    let contract;
    let mockStub;
    let mockClientIdentityUser1;
    let mockClientIdentityUser2;
    let state;
    let clock;

    beforeEach('Sandbox creation', () => {
        sandbox = sinon.createSandbox();

        ctx = sinon.createStubInstance(Context);
        mockStub = sinon.createStubInstance(ChaincodeStub);
        ctx.stub = mockStub;
        mockClientIdentityUser1 = sinon.createStubInstance(ClientIdentity);
        mockClientIdentityUser1.getID.returns('user1');
        mockClientIdentityUser1.getAttributeValue.withArgs('role').returns('admin');
        mockClientIdentityUser1.getAttributeValue.withArgs('username').returns('user1_admin');
        mockClientIdentityUser1.getMSPID.returns(orgMSPID);

        mockClientIdentityUser2 = sinon.createStubInstance(ClientIdentity);
        mockClientIdentityUser2.getID.returns('user2');
        mockClientIdentityUser2.getAttributeValue.withArgs('role').returns('user');
        mockClientIdentityUser2.getAttributeValue.withArgs('username').returns('user2_user');
        mockClientIdentityUser2.getMSPID.returns(orgMSPID);

        mockStub.getState.callsFake((key) => {
            if (key in state === false) {
                return undefined;
            }
            return Buffer.from(state[key]);
        });
        mockStub.putState.callsFake((key, value) => {
            state[key] = value.toString('utf8');
        });
        mockStub.deleteState.callsFake((key) => {
            delete state[key];
        });
        mockStub.createCompositeKey.callsFake(createCompositeKeyFake);

        state = {};

        ctx.clientIdentity = mockClientIdentityUser1;

        contract = new CoconikoCoinContract();
        contract.Initialize(ctx);

        ctx.clientIdentity = mockClientIdentityUser1;
        contract.CreateUserAccount(ctx);

        ctx.clientIdentity = mockClientIdentityUser2;
        contract.CreateUserAccount(ctx);

        ctx.clientIdentity = mockClientIdentityUser1;
        // comment this for suppress debug message.
        console.debug = function (...args) {
            // console.log(args);
        };
    });

    afterEach('Sandbox restoration', () => {
        sandbox.restore();
        if (clock) { clock.restore(); }
        if (console.debug) {
            delete console.debug;
        }
    });


    describe('CoconikoCoinContract#Initialize', () => {
        it('should get token name', async () => {
            const name = await contract.TokenName(ctx);
            expect(name).to.equal('coconiko-coin');
        });
    });


    describe('CoconikoCoinContract#Mint', () => {
        it('should throw invalid parameter error', async () => {
            try {
                await contract.Mint(ctx, -1);
            } catch (err) {
                expect(err.message).to.equal('mint amount must be a positive integer');
            }
        });
        it('should throw days must be a positive integer error', async () => {
            try {
                await contract.Mint(ctx, 10, -1);
            } catch (err) {
                expect(err.message).to.equal('days must >= 0 and must be a positive integer');
            }
        });
        it('should mint unlimit date coconiko-coin', async () => {
            await contract.Mint(ctx, 10);
            console.debug(state);
            const info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(10);
        });
        it('should mint coconiko-coin', async () => {
            let info;
            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(0);

            let fackeDate = new Date('2022-01-01T00:00:00.000Z');
            clock = sinon.useFakeTimers(fackeDate);
            await contract.Mint(ctx, 100, 180);
            console.debug(state);

            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(100);

            expect(state[CoinTransferEvent.createKey(ctx, fackeDate.toISOString(), '0x0', 'user1')])
                .to.equal('{"docType":"coin-transfer-event","from":"0x0","to":"user1","amount":100,"expirationDate":"2022-06-30","timestamp":"2022-01-01T00:00:00.000Z"}');

            // Mint 180 days coconiko-coin
            fackeDate = new Date('2023-01-01T00:00:00.000Z');
            clock = sinon.useFakeTimers(fackeDate);
            await contract.Mint(ctx, 10, 180);
            console.debug(state);

            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(110);

            expect(state[CoinTransferEvent.createKey(ctx, fackeDate.toISOString(), '0x0', 'user1')])
                .to.equal('{"docType":"coin-transfer-event","from":"0x0","to":"user1","amount":10,"expirationDate":"2023-06-30","timestamp":"2023-01-01T00:00:00.000Z"}');

            // unlimit days coconiko-coin
            fackeDate = new Date(Date.UTC(2023, 0, 2));
            clock = sinon.useFakeTimers(fackeDate);
            await contract.Mint(ctx, 10, 0);
            console.debug(state);
            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(120);

            expect(state[CoinTransferEvent.createKey(ctx, fackeDate.toISOString(), '0x0', 'user1')])
                .to.equal('{"docType":"coin-transfer-event","from":"0x0","to":"user1","amount":10,"expirationDate":null,"timestamp":"2023-01-02T00:00:00.000Z"}');
        });

        it('should burn expired coconiko-coin', async () => {
            let info;
            clock = sinon.useFakeTimers(new Date(Date.UTC(2023, 0, 1)));
            await contract.Mint(ctx, 100, 10);
            // Mint 10 coconiko-coin with expired 1 days.
            await contract.Mint(ctx, 10, 1);

            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(110);
            await contract.BurnExpired(ctx, 'user1', '2023-01-02');
            console.debug(state);
            info = await contract.ClientAccountInfo(ctx);
            expect(info.balance).to.equal(100);
        });
    });


    describe('CoconicoCoinContract#TransferFrom', () => {
        it('Should throw Cannot transfer to self', async () => {
            try {
                await contract.TransferFrom(ctx, 'user1', 'user1', 100);
            } catch (err) {
                expect(err.message).to.equal('Cannot transfer to self');
            }
        });
        it('Should throw client is not authorized to transfer', async () => {
            ctx.clientIdentity = mockClientIdentityUser2;
            try {
                await contract.TransferFrom(ctx, 'user1', 'user2', 100);
            } catch (err) {
                expect(err.message).to.equal('Client is not authorized to transfer');
            }
        });
        it('Should throw client account has insufficient funds.', async () => {
            try {
                await contract.Mint(ctx, 10, 10);
                await contract.TransferFrom(ctx, 'user1', 'user2', 100);
            } catch (err) {
                expect(err.message).to.equal('Client account has insufficient funds.');
            }
        });

        it('Should throw Client account has insufficient funds.', async () => {
            ctx.clientIdentity = mockClientIdentityUser2;
            try {
                await contract.TransferFrom(ctx, 'user2', 'user1', 100);
            } catch (err) {
                expect(err.message).to.equal('Client account has insufficient funds.');
            }
        });
        it('Should throw transfer amount must be a positive integer', async () => {
            try {
                await contract.Mint(ctx, 100, 10);
                await contract.TransferFrom(ctx, 'user1', 'user2', -10);
            } catch (err) {
                expect(err.message).to.equal('transfer amount must be a positive integer');
            }
        });
        it('Transfer coconiko-coin', async () => {
            const coinPrefix = CoconikoCoin.docType();
            clock = sinon.useFakeTimers(new Date(Date.UTC(2023, 0, 1)));
            await contract.Mint(ctx, 10, 20);
            clock = sinon.useFakeTimers(new Date(Date.UTC(2023, 1, 1)));
            await contract.Mint(ctx, 20, 20);
            clock = sinon.useFakeTimers(new Date(Date.UTC(2023, 2, 1)));
            await contract.Mint(ctx, 30, 20);
            console.debug('before transfer:', state);
            expect(await contract.BalanceOf(ctx, 'user1')).to.equal(60);
            expect(await contract.BalanceOf(ctx, 'user2')).to.equal(0);
            mockStub.getQueryResult.resolves(
                new MockIterator(queryStateForIteratror(state, `${coinPrefix}#user1#`))
            );

            await contract.TransferFrom(ctx, 'user1', 'user2', 35);
            console.debug('after transfer:', state);
            expect(state[`${coinPrefix}#user2#2023-01-21`]).to.equal('{"docType":"coconiko-coin","amount":10,"expirationDate":"2023-01-21","owner":"user2","burned":false}');
            expect(state[`${coinPrefix}#user2#2023-02-21`]).to.equal('{"docType":"coconiko-coin","amount":20,"expirationDate":"2023-02-21","owner":"user2","burned":false}');
            expect(state[`${coinPrefix}#user2#2023-03-21`]).to.equal('{"docType":"coconiko-coin","amount":5,"expirationDate":"2023-03-21","owner":"user2","burned":false}');

            expect(state[`${coinPrefix}#user1#2023-01-21`]).to.be.undefined;
            expect(state[`${coinPrefix}#user1#2023-02-21`]).to.be.undefined;
            expect(state[`${coinPrefix}#user1#2023-03-21`]).to.equal('{"docType":"coconiko-coin","amount":25,"expirationDate":"2023-03-21","owner":"user1","burned":false}');


            expect(await contract.BalanceOf(ctx, 'user1')).to.equal(25);
            expect(await contract.BalanceOf(ctx, 'user2')).to.equal(35);

            mockStub.getQueryResult.resolves(
                new MockIterator(queryStateForIteratror(state, `${coinPrefix}#user1#`))
            );

            await contract.Transfer(ctx, 'user2', 25);
            console.debug(state);
            expect(state[`${coinPrefix}#user1#2023-03-21`]).to.be.undefined;
            expect(state[`${coinPrefix}#user2#2023-03-21`]).to.equal('{"docType":"coconiko-coin","amount":30,"expirationDate":"2023-03-21","owner":"user2","burned":false}');
            expect(await contract.BalanceOf(ctx, 'user1')).to.equal(0);
            expect(await contract.BalanceOf(ctx, 'user2')).to.equal(60);
        });
    });

    describe('Coconiko Summary test', () => {
        it('summary test 1', async () => {
            mockStub.getQueryResultWithPagination.onCall(0).resolves({
                iterator: new MockIterator(
                    [{
                        key:'coin-transfer-event#2022-01-01#0x0#user1',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"0x0","to":"user1","amount":110,"expirationDate":"2022-06-30","timestamp":"2022-01-01T00:00:00.000Z"}'),
                    },{
                        key:'coin-transfer-event#2022-01-02#0x0#user2',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"0x0","to":"user2","amount":100,"expirationDate":"2022-06-30","timestamp":"2022-01-02T00:00:00.000Z"}')
                    }]
                ),
                metadata: {
                    fetchedRecordsCount: 2,
                    bookmark: 'bookmark01'
                }
            });
            mockStub.getQueryResultWithPagination.onCall(1).resolves({
                iterator: new MockIterator(
                    [{
                        key:'coin-transfer-event#2022-02-01#user1#user2',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"user1","to":"user2","amount":100,"expirationDate":"2022-06-30","timestamp":"2022-01-01T00:00:00.000Z"}'),
                    },{
                        key:'coin-transfer-event#2022-02-02#user2#user1',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"user2","to":"user1","amount":50,"expirationDate":"2022-06-30","timestamp":"2022-01-02T00:00:00.000Z"}')
                    }]
                ),
                metadata: {
                    fetchedRecordsCount:2,
                    bookmark: 'bookmark02'
                }
            });
            mockStub.getQueryResultWithPagination.onCall(2).resolves({
                iterator: new MockIterator([]),
                metadata: {
                    fetchedRecordsCount:0,
                    bookmark: 'bookmark03'
                }
            });
            ctx.clientIdentity = mockClientIdentityUser2;
            await contract.ActiveUser(ctx, false);
            ctx.clientIdentity = mockClientIdentityUser1;
            let ret = await contract.Summary(ctx);
            console.debug(ret);
        });
        it('summary test 2', async () => {
            mockStub.getQueryResultWithPagination.onCall(0).resolves({
                iterator: new MockIterator(
                    [{
                        key:'coin-transfer-event#2022-01-01#0x0#user1',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"0x0","to":"user1","amount":110,"expirationDate":"2022-06-30","timestamp":"2022-01-01T00:00:00.000Z"}'),
                    },{
                        key:'coin-transfer-event#2022-01-02#0x0#user2',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"0x0","to":"user2","amount":100,"expirationDate":"2022-06-30","timestamp":"2022-01-02T00:00:00.000Z"}')
                    }]
                ),
                metadata: {
                    fetchedRecordsCount: 2,
                    bookmark: 'bookmark01'
                }
            });
            mockStub.getQueryResultWithPagination.onCall(1).resolves({
                iterator: new MockIterator(
                    [{
                        key:'coin-transfer-event#2022-02-01#user1#user2',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"user1","to":"user2","amount":100,"expirationDate":"2022-06-30","timestamp":"2022-01-01T00:00:00.000Z"}'),
                    },{
                        key:'coin-transfer-event#2022-02-02#user2#user1',
                        value: Buffer.from('{"docType":"coin-transfer-event","from":"user2","to":"user1","amount":50,"expirationDate":"2022-06-30","timestamp":"2022-01-02T00:00:00.000Z"}')
                    }]
                ),
                metadata: {
                    fetchedRecordsCount:2,
                    bookmark: 'bookmark02'
                }
            });
            mockStub.getQueryResultWithPagination.onCall(2).resolves({
                iterator: new MockIterator([]),
                metadata: {
                    fetchedRecordsCount:0,
                    bookmark: 'bookmark03'
                }
            });
            ctx.clientIdentity = mockClientIdentityUser2;
            await contract.ActiveUser(ctx, false);
            ctx.clientIdentity = mockClientIdentityUser1;
            let ret = await contract.Summary(ctx, '', '');
            console.debug(ret);
        });
    });
});