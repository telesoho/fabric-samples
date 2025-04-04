#!/bin/bash

echo "Please turn off your VPN before proceeding..."
read -p "Press enter once your VPN is disabled"

set -v -eou pipefail

# Log all commands
set -x

# All tests run in the workshop root folder
cd "$(dirname "$0")"/..

# Clean house on exit
function exitHook() {

  # Just in case the just left some bits running around
  kind delete cluster --name kind

  # Just in case ...
  if docker inspect kind-registry &>/dev/null; then
      echo "Stopping container registry"
      docker kill kind-registry
      docker rm kind-registry
  fi

  # Delete the sample network configuration and crypto material
  rm -rf "${WORKSHOP_PATH}"/_cfg
}

# trap exitHook SIGINT 
#trap exitHook SIGINT SIGTERM EXIT

###############################################################################
# 00-setup
###############################################################################

export WORKSHOP_PATH="${PWD}"
export PATH="${WORKSHOP_PATH}/bin:${PATH}"
export FABRIC_CFG_PATH="${WORKSHOP_PATH}/config"

"${WORKSHOP_PATH}/check.sh"

kubectl version --client -o yaml

kind version

export LOG_ERROR_LINES=20


###############################################################################
# 10-kube
###############################################################################

# env checks
[[ ${WORKSHOP_PATH+x}   ]] || exit 1
[[ ${FABRIC_CFG_PATH+x} ]] || exit 1

just check-setup

# Set the ingress domain and target k8s namespace
export WORKSHOP_INGRESS_DOMAIN=localho.st
export WORKSHOP_NAMESPACE=test-network

# KIND will set the current kube client context in ~/.kube/config
kubectl cluster-info

# Run k9s to observe the target namespace
# k9s -n $WORKSHOP_NAMESPACE

just check-kube

# env checks
[[ ${WORKSHOP_PATH+x}           ]] || exit 1
[[ ${FABRIC_CFG_PATH+x}         ]] || exit 1
[[ ${WORKSHOP_INGRESS_DOMAIN+x} ]] || exit 1
[[ ${WORKSHOP_NAMESPACE+x}      ]] || exit 1

export WORKSHOP_CRYPTO=$WORKSHOP_PATH/infrastructure/sample-network/temp

# Hit the CAs using the TLS certs, etc.
curl -s --cacert $WORKSHOP_CRYPTO/cas/org0-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org0-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c
curl -s --cacert $WORKSHOP_CRYPTO/cas/org1-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org1-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c
curl -s --cacert $WORKSHOP_CRYPTO/cas/org2-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org2-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c

# enrollment certificates and channel MSP
find ${WORKSHOP_CRYPTO}


###############################################################################
# 30-chaincode
###############################################################################

just check-network

# env checks
[[ ${FABRIC_CFG_PATH+x}         ]] || exit 1
[[ ${WORKSHOP_PATH+x}           ]] || exit 1
[[ ${WORKSHOP_CRYPTO+x}         ]] || exit 1
[[ ${WORKSHOP_INGRESS_DOMAIN+x} ]] || exit 1
[[ ${WORKSHOP_NAMESPACE+x}      ]] || exit 1


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


function build_cc() {
  CONTAINER_REGISTRY=localhost:5000
  CHAINCODE_IMAGE=$CONTAINER_REGISTRY/$CHAINCODE_NAME

  # Build the chaincode image
  ARCH=$(uname -m | sed 's/x86_64/amd64/g' | sed 's/aarch64/arm64/g')
  docker build --build-arg TARGETARCH=${ARCH} -t $CHAINCODE_IMAGE contracts/$CHAINCODE_NAME-typescript

  # Push the image to the insecure container registry
  docker push $CHAINCODE_IMAGE
}

function build_cc_typescript() {
  CONTAINER_REGISTRY=localhost:5000
  CHAINCODE_IMAGE=$CONTAINER_REGISTRY/$CHAINCODE_NAME

  # Build the chaincode image
  ARCH=$(uname -m | sed 's/x86_64/amd64/g' | sed 's/aarch64/arm64/g')
  docker build --build-arg TARGETARCH=${ARCH} -t $CHAINCODE_IMAGE contracts/$CHAINCODE_NAME/chaincode-typescript

  # Push the image to the insecure container registry
  docker push $CHAINCODE_IMAGE
}

function prepare_cc() {
  IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' $CHAINCODE_IMAGE | cut -d'@' -f2)
  infrastructure/pkgcc.sh -l $CHAINCODE_NAME -n localhost:5000/$CHAINCODE_NAME -d $IMAGE_DIGEST
}

function install_cc() {

  CORE_PEER_ADDRESS=${ORG1_PEER1_ADDRESS} peer lifecycle chaincode install $CHAINCODE_PACKAGE
  CORE_PEER_ADDRESS=${ORG1_PEER2_ADDRESS} peer lifecycle chaincode install $CHAINCODE_PACKAGE

  export PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid $CHAINCODE_PACKAGE) && echo $PACKAGE_ID

  peer lifecycle \
    chaincode       approveformyorg \
    --channelID     ${CHANNEL_NAME} \
    --name          ${CHAINCODE_NAME} \
    --version       ${VERSION} \
    --package-id    ${PACKAGE_ID} \
    --sequence      ${SEQUENCE} \
    --orderer       ${ORDERER_ENDPOINT} \
    --tls --cafile  ${ORDERER_TLS_CERT} \
    --connTimeout   15s

  peer lifecycle \
    chaincode       commit \
    --channelID     ${CHANNEL_NAME} \
    --name          ${CHAINCODE_NAME} \
    --version       ${VERSION} \
    --sequence      ${SEQUENCE} \
    --orderer       ${ORDERER_ENDPOINT} \
    --tls --cafile  ${ORDERER_TLS_CERT} \
    --connTimeout   15s
}

function check_cc_meta() {
  peer chaincode query -n $CHAINCODE_NAME -C mychannel -c '{"Args":["org.hyperledger.fabric:GetMetadata"]}' | jq
}


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

###############################################################################
# 31 : build, tag, push, install
###############################################################################

CHANNEL_NAME=mychannel
VERSION=v1.0.0
SEQUENCE=1

CHAINCODE_NAME=coconiko
CHAINCODE_PACKAGE=${CHAINCODE_NAME}.tgz

# build_cc_typescript
# prepare_cc
# install_cc
check_cc_meta
invoke_chaincode $CHAINCODE_NAME '{"Args":["CoconikoCoinContract:Initialize"]}'

