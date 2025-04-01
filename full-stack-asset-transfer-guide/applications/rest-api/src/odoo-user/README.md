# User Management and Wallet System

This module handles user management and wallet functionality for Hyperledger Fabric 2.5.

## Features

- User creation and retrieval
- Wallet management (database and file system storage options)
- Gateway middleware for accessing Fabric network

## API Endpoints

### PUT /user
Creates a new user with wallet entry.

**Headers**:
- X-API-Key: Required for application identification

**Body**:
```json
{
  "userId": "user123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User created successfully"
}
```

### GET /user/:userId
Retrieves user information.

**Headers**:
- X-API-Key: Required for application identification

**Response**:
```json
{
  "userId": "user123",
  "mspId": "user123.app1"
}
```

## Configuration

The wallet storage type can be configured via environment variables:
- `WALLET_STORE_TYPE`: Set to either `database` or `filesystem`
- `WALLET_FILE_SYSTEM_PATH`: Path to store wallet files when using filesystem storage 