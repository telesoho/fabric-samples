'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { CoinTransferEvent } = require('../lib/CoconikoCoin/CoinTransferEvent');
const { UserInfo} = require('../lib/UserInfo');

const userInfos = require('./data/user-info.json');
const transferEvents = require('./data/coin-transfer-event.json');
const userInfoTable = require('./data/user-info-table.json');
const transferEventTable = require('./data/transfer-table.json');

chai.should();
chai.use(chaiAsPromised);

const SystemId = '0x0';
function getUserInfo(accountId) {
    const users = userInfos.result.results;
    const user = users.find(item => item.Record.accountId === accountId);
    return UserInfo.fromJSON(user.Record);
}

function getUserInfoFromTable(accountId) {
    const users = userInfoTable.result;
    const user = users.find(item => item.account_id === accountId);

    const json = {
        docType: UserInfo.docType(),
        userId: user.user_id,
        accountId: user.account_id,
        role: user.role,
        balance: user.balance,
        active: user.active
    };
    return UserInfo.fromJSON(json);
}

function toBoolean(v) {
    return typeof v === 'boolean' ? v : v === 'true';
}

function Summary() {

    const summary = {
        totalMinted: 0,
        totalUsed: 0
    };

    for (const event of transferEvents.result.results) {
        const cv = CoinTransferEvent.fromJSON(event.Record);
        if (cv.from === SystemId) {
            const toUserInfo = getUserInfo(cv.to);
            if (toUserInfo.active === true) {
                summary.totalMinted += cv.amount;
            }
        }
        if (cv.from !== SystemId) {
            const fromUserInfo = getUserInfo(cv.from);
            if (fromUserInfo.active === true) {
                summary.totalUsed += cv.amount;
            }
        }
    }
    return summary;
}

function SummaryTable() {
    const summary = {
        totalMinted: 0,
        totalUsed: 0
    };

    for (const event of transferEventTable.result) {
        const json = {
            docType: CoinTransferEvent.docType(),
            from: event.from_user,
            to: event.to_user,
            amount: event.amount,
            expirationDate: event.expirationDate,
            timestamp: event.timestamp
        };
        const cv = CoinTransferEvent.fromJSON(json);
        if (cv.from === SystemId) {
            const toUserInfo = getUserInfoFromTable(cv.to);
            if (toUserInfo.active) {
                summary.totalMinted += cv.amount;
            }
        }
        if (cv.from !== SystemId) {
            const fromUserInfo = getUserInfoFromTable(cv.from);
            if (fromUserInfo.active) {
                summary.totalUsed += cv.amount;
            }
        }
    }
    return summary;
}


function encodeDocumentKey(key) {
    return key.replace(/\u0000/g/* eslint-disable-line no-control-regex */, '{u0000}');
}

function getEventByKey(docKey) {
    const key = encodeDocumentKey(docKey);
    return transferEventTable.result.find(t => t.txid === key);
}

function getUserByAccountId(accountId) {
    return userInfoTable.result.find(t => t.account_id === accountId);
}

function compareEvent(cv, ev) {
    return cv.from === ev.from_user &&
    cv.to === ev.to_user &&
    cv.amount === ev.amount &&
    cv.timestamp === ev.event_timestamp;
}


function compareUserInfo(ud, ut) {
    return ud.user_id === ut.userId &&
        toBoolean(ud.active) === toBoolean(ut.active) &&
        ud.balance === ut.balance &&
        ud.role === ut.role;
}

describe('Summary', () => {

    beforeEach('Sandbox creation', () => {
        // comment this for suppress debug message.
        console.debug = function (...args) {
            // console.log(args);
        };
    });

    afterEach('Sandbox restoration', () => {
        if (console.debug) {
            delete console.debug;
        }
    });

    describe('Summary ...', () => {
        it('compare user data', async () => {
            console.debug('Boolean(\'false\')', Boolean('false'));
            for (const user of userInfos.result.results) {
                const ud = user.Record;
                const ut = getUserByAccountId(ud.accountId);
                if(compareUserInfo(ud,ut) === false) {
                    console.info('user doc:', ud);
                    console.info('user table:', ut);
                }
            }
        });
        it('compare event data', async () => {
            for (const event of transferEvents.result.results) {
                const cv = event.Record;
                const ev = getEventByKey(event.Key);
                if(compareEvent(cv,ev) === false) {
                    console.info(cv, ev);
                }
            }
        });
        it('get summary', async () => {
            const sum = Summary();
            console.debug(sum);
            const sumTable = SummaryTable();
            console.debug(sumTable);
        });
    });
});