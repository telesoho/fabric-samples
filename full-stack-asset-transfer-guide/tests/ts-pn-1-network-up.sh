#!/bin/bash

echo "Please turn on your VPN before proceeding..."
read -p "Press enter once your VPN is enabled"

if [[ "$@" == *"skip"* ]]; then
  echo "skip"
  set -x
else
set -v -eou pipefail

# Log all commands
set -x

# All tests run in the workshop root folder
cd "$(dirname "$0")"/..
fi

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

trap exitHook SIGINT 
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

# Check if skip-kind argument is passed
if [[ "$@" == *"skip-kind"* || "$@" == *"skip"* ]]; then
  echo "skip-kind"
else
  # Create a Kubernetes cluster in Docker, configure an Nginx ingress, and docker container registry
  just kind
fi

# KIND will set the current kube client context in ~/.kube/config
kubectl cluster-info

# Run k9s to observe the target namespace
# k9s -n $WORKSHOP_NAMESPACE

if [[ "$@" == *"skip-fabric"* || "$@" == *"skip"* ]]; then
  echo "skip-fabric"
else
###############################################################################
# 20-fabric
###############################################################################

# Clear out any certs from a prior run, just in case
rm -rf ${WORKSHOP_PATH}/infrastructure/sample-network/temp

just check-kube

# env checks
[[ ${WORKSHOP_PATH+x}           ]] || exit 1
[[ ${FABRIC_CFG_PATH+x}         ]] || exit 1
[[ ${WORKSHOP_INGRESS_DOMAIN+x} ]] || exit 1
[[ ${WORKSHOP_NAMESPACE+x}      ]] || exit 1

# check Nginx ingress
kubectl -n ingress-nginx get all
kubectl -n ingress-nginx get deployment.apps/ingress-nginx-controller

curl http://${WORKSHOP_INGRESS_DOMAIN}
curl --insecure https://${WORKSHOP_INGRESS_DOMAIN}:443

# Install operator CRDs
kubectl apply -k https://github.com/hyperledger-labs/fabric-operator.git/config/crd


kubectl get customresourcedefinition.apiextensions.k8s.io/ibpcas.ibp.com
kubectl get customresourcedefinition.apiextensions.k8s.io/ibpconsoles.ibp.com
kubectl get customresourcedefinition.apiextensions.k8s.io/ibporderers.ibp.com
kubectl get customresourcedefinition.apiextensions.k8s.io/ibppeers.ibp.com

kubectl wait --for condition=established customresourcedefinition.apiextensions.k8s.io/ibpcas.ibp.com
kubectl wait --for condition=established customresourcedefinition.apiextensions.k8s.io/ibpconsoles.ibp.com
kubectl wait --for condition=established customresourcedefinition.apiextensions.k8s.io/ibporderers.ibp.com
kubectl wait --for condition=established customresourcedefinition.apiextensions.k8s.io/ibppeers.ibp.com

echo "Please turn off your VPN before proceeding..."
read -p "Press enter once your VPN is disabled"

# Bring up the network
just cloud-network

# Operator running?
kubectl -n ${WORKSHOP_NAMESPACE} get deployment fabric-operator

# Did it apply the CRDs?
kubectl -n ${WORKSHOP_NAMESPACE} get ibpca org0-ca
kubectl -n ${WORKSHOP_NAMESPACE} get ibpca org1-ca
kubectl -n ${WORKSHOP_NAMESPACE} get ibpca org2-ca
kubectl -n ${WORKSHOP_NAMESPACE} get ibppeer org1-peer1
kubectl -n ${WORKSHOP_NAMESPACE} get ibppeer org1-peer2
kubectl -n ${WORKSHOP_NAMESPACE} get ibppeer org2-peer1
kubectl -n ${WORKSHOP_NAMESPACE} get ibppeer org2-peer2
kubectl -n ${WORKSHOP_NAMESPACE} get ibporderer org0-orderersnode1
kubectl -n ${WORKSHOP_NAMESPACE} get ibporderer org0-orderersnode2
kubectl -n ${WORKSHOP_NAMESPACE} get ibporderer org0-orderersnode3

# Did the operator reconcile the CRDs as deployments?
kubectl -n ${WORKSHOP_NAMESPACE} get deployment fabric-operator
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org0-ca
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org0-orderersnode1
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org0-orderersnode2
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org0-orderersnode3
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org1-ca
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org1-peer1
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org1-peer2
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org2-ca
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org2-peer1
kubectl -n ${WORKSHOP_NAMESPACE} get deployment org2-peer2

fi

export WORKSHOP_CRYPTO=$WORKSHOP_PATH/infrastructure/sample-network/temp

# Hit the CAs using the TLS certs, etc.
curl -s --cacert $WORKSHOP_CRYPTO/cas/org0-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org0-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c
curl -s --cacert $WORKSHOP_CRYPTO/cas/org1-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org1-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c
curl -s --cacert $WORKSHOP_CRYPTO/cas/org2-ca/tls-cert.pem https://$WORKSHOP_NAMESPACE-org2-ca-ca.$WORKSHOP_INGRESS_DOMAIN/cainfo | jq -c

if [[ "$@" == *"skip-channel"* || "$@" == *"skip"* ]]; then
  echo "skip-channel"
else
  # create a channel
  just cloud-channel
fi

# enrollment certificates and channel MSP
find ${WORKSHOP_CRYPTO}

###############################################################################
# 33 : crazy time, run CCaaS on localhost, invoked by peer in k8s
###############################################################################

echo "todo: 33 : crazy time, run CCaaS on localhost, invoked by peer in k8s"


##### Take it further: Gateway load balancing

# Set up the k8s Ingress and Service
kubectl kustomize \
  infrastructure/sample-network/config/gateway \
  | envsubst \
  | kubectl -n ${WORKSHOP_NAMESPACE} apply -f -


###############################
# monitoring
###############################

just monitoring

###############################
# ambs.telesoho.com
###############################

just ambs

# just cloud-rest-easy
# just console

###############################################################################
# 90-teardown
###############################################################################

# just cloud-network-down

# popd

###############################################################################
# Looks good!
###############################################################################
# exit 0
