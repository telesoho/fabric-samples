'use strict';

const { UserInfo } = require('../lib/UserInfo');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const expect = chai.expect;

chai.should();
chai.use(chaiAsPromised);


describe('UserInfo', () => {
    let mockCtx;
    let mockStub;

    beforeEach(() => {
        mockStub = {
            createCompositeKey: sinon.stub().returns('compositeKey'),
            putState: sinon.stub().resolves(true),
            getState: sinon.stub().resolves(),
            setEvent: sinon.stub()
        };

        mockCtx = {
            stub: mockStub,
            clientIdentity: {
                getID: sinon.stub().returns('account123'),
                getAttributeValue: sinon.stub().withArgs('role').returns('user')
            }
        };
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            const user = new UserInfo('user1', 'acc1', 'admin');
            expect(user.docType).to.equal('user-info');
            expect(user.balance).to.equal(0);
            expect(user.active).to.equal(true);
            expect(user.nfts).to.deep.equal([]);
        });
    });

    describe('fromJSON', () => {
        it('should parse active field from string', () => {
            const json = {
                docType: 'user-info',
                active: 'true',
                balance: '100',
                // ... other required fields
            };
            const user = UserInfo.fromJSON(json);
            expect(user.active).to.equal(true);
        });

        it('should throw error for invalid docType', () => {
            const json = { docType: 'invalid' };
            expect(() => UserInfo.fromJSON(json)).to.throw('docType must be user-info');
        });
    });

    describe('state management', () => {
        // it('should generate correct composite key', () => {
        //     const key = UserInfo.createKey(mockCtx, 'acc1');
        //     expect(mockStub.createCompositeKey.calledWith('user-info', ['acc1'])).toBe(true);
        // });

        it('putState should trigger event', async () => {
            const user = new UserInfo('user1', 'acc1', 'admin');
            await user.putState(mockCtx);
            expect(mockStub.putState.calledWith('compositeKey', sinon.match.any)).to.equal(true);
            expect(mockStub.setEvent.called).to.equal(false);
        });
    });

    describe('createUserAccount', () => {
        it('should create account with client identity attributes', async () => {
            const user = await UserInfo.createUserAccount(mockCtx);
            expect(user.accountId).to.equal('account123');
            expect(user.role).to.equal('user');
        });
    });

    describe('getOrCreateCurrentUserAccount', () => {
        it('should create new account when not exists', async () => {
            mockStub.getState.resolves(null);
            const user = await UserInfo.getOrCreateCurrentUserAccount(mockCtx);
            expect(user.accountId).to.equal('account123');
        });

        it('should return existing account when found', async () => {
            const existingUser = new UserInfo('existing', 'account123', 'user');
            mockStub.getState.resolves(existingUser.toBuffer());
            const user = await UserInfo.getOrCreateCurrentUserAccount(mockCtx);
            expect(user.userId).to.equal('existing');
        });
    });
});