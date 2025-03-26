export interface ContractEventData {
  key: string;
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface UserInfoJSON {
  docType: string;
  userId: string;
  accountId: string;
  role: string;
  balance: number;
  active: boolean;
  nfts: string[];
  created: string;
  updated: string;
  [key: string]: unknown;
}

export interface SystemInfoJSON {
  docType: string;
  totalSupply: number;
  totalActiveSupply: number;
  [key: string]: unknown;
}

export interface CoinTransferEventJSON {
  from: string;
  to: string;
  amount: number;
  expirationDate?: string;
  [key: string]: unknown;
}

export interface NFTMetadata {
  name: string;
  description?: string;
  image?: string;
  attributes?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface CoconikoNFTJSON {
  docType: string;
  id: string;
  owner: string;
  creator: string;
  metadata: NFTMetadata;
  created: string;
  lastUpdated: string;
  burned: boolean;
  [key: string]: unknown;
}

export interface NFTTransferEventJSON {
  from: string;
  to: string;
  nftId: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface GovernanceTokenJSON {
  docType: string;
  id: string;
  owner: string;
  amount: number;
  created: string;
  [key: string]: unknown;
}

export interface ProposalJSON {
  docType: string;
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed';
  forVotes: number;
  againstVotes: number;
  startBlock: number;
  endBlock: number;
  created: string;
  updated: string;
  executed?: string;
  [key: string]: unknown;
}

export interface ProposalVoteJSON {
  docType: string;
  proposalId: string;
  voter: string;
  support: boolean;
  votes: number;
  created: string;
  [key: string]: unknown;
}
