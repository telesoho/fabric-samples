#!/bin/bash
# see: https://github.com/hyperledger/fabric-samples/blob/main/full-stack-asset-transfer-guide/docs/SmartContractDev/01-Exercise-Getting-Started.md

cd ~/fabric-samples/full-stack-asset-transfer-guide

export WORKSHOP_PATH=$(pwd)
export PATH=${WORKSHOP_PATH}/bin:$PATH
export FABRIC_CFG_PATH=${WORKSHOP_PATH}/config

just check

just microfab

just debugcc_coconiko


peer chaincode invoke -C mychannel -o orderer-api.127-0-0-1.nip.io:8080 -n coconiko -c '{"Args":["CoconikoCoinContract:CreateUserAccount"]}' --connTimeout 15s
peer chaincode invoke -C mychannel -o orderer-api.127-0-0-1.nip.io:8080 -n coconiko -c '{"Args":["CoconikoCoinContract:ActiveUser", "{}"]}' --connTimeout 15s
peer chaincode query -C mychannel -n coconiko -c '{"Args":["CoconikoCoinContract:ClientAccountInfo"]}' | jq