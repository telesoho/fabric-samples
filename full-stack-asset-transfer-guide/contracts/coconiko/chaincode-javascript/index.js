'use strict';

const { CoconikoCoinContract } = require('./lib/CoconikoCoin/CoconikoCoinContract.js');
const { CoconikoNFTContract } = require('./lib/NFT/CoconikoNFTContract.js');
const { GovernanceTokenContract } = require('./lib/GovernanceToken/governance-token-contract.js');

module.exports.CoconikoCoinContract = CoconikoCoinContract;
module.exports.CoconikoNFTContract = CoconikoNFTContract;
module.exports.GovernanceTokenContract = GovernanceTokenContract;
module.exports.contracts = [CoconikoCoinContract, CoconikoNFTContract, GovernanceTokenContract];