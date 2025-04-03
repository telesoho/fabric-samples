#!/bin/bash
# see: https://github.com/hyperledger/fabric-samples/blob/main/full-stack-asset-transfer-guide/docs/SmartContractDev/01-Exercise-Getting-Started.md

# push ~/fabric-samples/full-stack-asset-transfer-guide

# export WORKSHOP_PATH=$(pwd)
# export PATH=${WORKSHOP_PATH}/bin:$PATH
# export FABRIC_CFG_PATH=${WORKSHOP_PATH}/config

export WORKSHOP_INGRESS_DOMAIN=localho.st
export WORKSHOP_NAMESPACE=test-network

export WORKSHOP_CRYPTO=$WORKSHOP_PATH/infrastructure/sample-network/temp

# org1-peer1 peer CLI context
export ORG1_PEER1_ADDRESS=${WORKSHOP_NAMESPACE}-org1-peer1-peer.${WORKSHOP_INGRESS_DOMAIN}:443
export ORG1_PEER2_ADDRESS=${WORKSHOP_NAMESPACE}-org1-peer2-peer.${WORKSHOP_INGRESS_DOMAIN}:443

export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_ADDRESS=${ORG1_PEER1_ADDRESS}
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_MSPCONFIGPATH=${WORKSHOP_CRYPTO}/enrollments/org1/users/org1admin/msp
export CORE_PEER_TLS_ROOTCERT_FILE=${WORKSHOP_CRYPTO}/channel-msp/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem
export CORE_PEER_CLIENT_CONNTIMEOUT=15s
export CORE_PEER_DELIVERYCLIENT_CONNTIMEOUT=15s
export ORDERER_ENDPOINT=${WORKSHOP_NAMESPACE}-org0-orderersnode1-orderer.${WORKSHOP_INGRESS_DOMAIN}:443
export ORDERER_TLS_CERT=${WORKSHOP_CRYPTO}/channel-msp/ordererOrganizations/org0/orderers/org0-orderersnode1/tls/signcerts/tls-cert.pem

export CHANNEL_NAME=mychannel

function invoke_chaincode() {
  local cc_name=$1
  shift

  peer chaincode invoke \
    -n              $cc_name \
    -C              $CHANNEL_NAME \
    -c              $@ \
    --orderer       ${ORDERER_ENDPOINT} \
    --tls --cafile  ${ORDERER_TLS_CERT} \
    --connTimeout   15s
  sleep 2
}

invoke_chaincode coconiko '{"Args":["CoconikoCoinContract:Initialize"]}'

# peer chaincode invoke -C mychannel -o orderer-api.127-0-0-1.nip.io:8080 -n coconiko -c '{"Args":["CoconikoCoinContract:CreateUserAccount"]}' --connTimeout 15s

