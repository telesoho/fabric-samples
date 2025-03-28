# Coconiko API

This directory contains the implementation of the Coconiko REST API for managing users, coins, NFTs, and governance tokens on the Fabric network.

## API Overview

The API is designed to provide an interface for the Coconiko chaincode with the following features:

- **User Management**: Register new users, get user information, and update user status.
- **Coin Operations**: Mint coins, transfer coins, get balances, and more.
- **NFT Operations**: Mint NFTs, transfer NFTs, and get NFT information.
- **Governance Token**: Create voting proposals, mint voting rights, and cast votes.
- **Debugging Helpers**: Query assets with pagination and execute PostgreSQL queries.

## Authentication

The API uses two authentication mechanisms:

1. **API Key Authentication**: All endpoints require an `X-API-Key` header for service authentication.
2. **User Authentication**: Many endpoints require a `userId` header to identify the user making the request.

## API Documentation

For a detailed description of all endpoints, request/response formats, and authentication requirements, refer to the Swagger definition in `coconiko_swagger.yaml`.

## Available Endpoints

### Health Endpoints
- `GET /ready` - Readiness check for cloud environments
- `GET /live` - Liveness check for Fabric network health

### User Management
- `PUT /api/coconiko/user` - Register a new user
- `GET /api/coconiko/user` - Get user information
- `POST /api/coconiko/user` - Update user information

### Coin Operations
- `POST /api/coconiko/Mint` - Mint new coins
- `POST /api/coconiko/BalanceOf` - Get balances for multiple users
- `POST /api/coconiko/Transfer` - Transfer coins to another user
- `POST /api/coconiko/TransferFrom` - Transfer coins from one user to another (admin only)
- `GET /api/coconiko/TotalSupply` - Get total supply of coins
- `POST /api/coconiko/BurnExpired` - Burn expired coins
- `GET /api/coconiko/ClientAccountEventHistory` - Get transaction event history
- `GET /api/coconiko/ClientAccountEventHistory/Count` - Count transaction events
- `GET /api/coconiko/Summary` - Get summary statistics

### NFT Operations
- `POST /api/coconiko/nft/Mint` - Mint a new NFT
- `POST /api/coconiko/nft/Transfer` - Transfer an NFT
- `GET /api/coconiko/nft/:tokenId` - Get NFT details
- `GET /api/coconiko/nft/my/NFTs` - Get user's NFT collection

### Governance Token (Unimplemented in Chaincode)
- `POST /api/coconiko/voting/MintProposal` - Create a new voting proposal
- `POST /api/coconiko/voting/MintVoteNFT` - Mint a voting NFT
- `POST /api/coconiko/voting/Cast` - Cast a vote
- `GET /api/coconiko/voting/Results/:proposalId` - Get voting results

### Debug Endpoints
- `POST /api/coconiko/queryAssetsWithPagination` - Query assets with pagination
- `POST /api/coconiko/postgres/query` - Execute a PostgreSQL query

## Environment Variables

The API requires the following environment variables:

- `API_KEY` - The API key for authenticating requests
- `CHAINCODE_NAME_COCONIKO` - The name of the Coconiko chaincode (defaults to 'coconiko') 