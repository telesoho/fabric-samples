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


# User organization MSP ID
export MSP_ID=Org1MSP
export ORG=org1
export USERNAME=org1user
export PASSWORD=org1userpw

# register / enroll the new user
ADMIN_MSP_DIR=$WORKSHOP_CRYPTO/enrollments/${ORG}/users/rcaadmin/msp
USER_MSP_DIR=$WORKSHOP_CRYPTO/enrollments/${ORG}/users/${USERNAME}/msp
PEER_MSP_DIR=$WORKSHOP_CRYPTO/channel-msp/peerOrganizations/${ORG}/msp

fabric-ca-client  register \
  --id.name       $USERNAME \
  --id.secret     $PASSWORD \
  --id.type       client \
  --url           https://$WORKSHOP_NAMESPACE-$ORG-ca-ca.$WORKSHOP_INGRESS_DOMAIN \
  --tls.certfiles $WORKSHOP_CRYPTO/cas/$ORG-ca/tls-cert.pem \
  --mspdir        $WORKSHOP_CRYPTO/enrollments/$ORG/users/rcaadmin/msp \
  --loglevel      debug

fabric-ca-client enroll \
  --url           https://$USERNAME:$PASSWORD@$WORKSHOP_NAMESPACE-$ORG-ca-ca.$WORKSHOP_INGRESS_DOMAIN \
  --tls.certfiles $WORKSHOP_CRYPTO/cas/$ORG-ca/tls-cert.pem \
  --mspdir        $WORKSHOP_CRYPTO/enrollments/$ORG/users/$USERNAME/msp \
  --loglevel      debug

mv $USER_MSP_DIR/keystore/*_sk $USER_MSP_DIR/keystore/key.pem

