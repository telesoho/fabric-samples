function launch_rest_api() {
export MSP_ID=Org1MSP
export ORG=org1
export USERNAME=rcaadmin
export PASSWORD=rcaadminpw

export WORKSHOP_INGRESS_DOMAIN=localho.st
export WORKSHOP_NAMESPACE=test-network

export WORKSHOP_CRYPTO=$WORKSHOP_PATH/infrastructure/sample-network/temp

local peer_pem=${WORKSHOP_CRYPTO}/channel-msp/peerOrganizations/org1/msp/tlscacerts/tlsca-signcert.pem
ARCH=$(uname -m | sed 's/x86_64/amd64/g' | sed 's/aarch64/arm64/g')

#configure secrets 
kubectl -n $WORKSHOP_NAMESPACE delete secret my-secret || true
kubectl create secret generic my-secret --from-file=tlsCertPath=$peer_pem --from-literal=USERNAME=$USERNAME --from-literal=PASSWORD=$PASSWORD -n $WORKSHOP_NAMESPACE
#build docker image and push to local registary
log "building restapi docker image"
docker build --build-arg TARGETARCH=${ARCH} -t localhost:5000/rest-api $WORKSHOP_PATH/applications/rest-api/
log "pushing restapi docker image to localregistry"
docker push localhost:5000/rest-api
#deploy rest api image to k8s
log "deploying rest api to k8s"
kubectl -n $WORKSHOP_NAMESPACE apply -f scripts/rest_api_deployment.yaml
}