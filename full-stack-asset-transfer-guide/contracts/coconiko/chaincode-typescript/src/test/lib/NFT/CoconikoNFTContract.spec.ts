import { CoconikoNFTContract } from '../../../lib/NFT/CoconikoNFTContract';
import { createMockContext } from '../../mocks/fabric-mock';

// Simple unit tests for CoconikoNFTContract
describe('CoconikoNFTContract', () => {
  let contract: CoconikoNFTContract;
  
  beforeEach(() => {
    createMockContext(); // Create context but don't store it since we're not using it
    contract = new CoconikoNFTContract();
  });
  
  describe('constructor', () => {
    it('should create a contract with the correct name', () => {
      expect(contract.getName()).toBe('CoconikoNFTContract');
    });
  });
}); 