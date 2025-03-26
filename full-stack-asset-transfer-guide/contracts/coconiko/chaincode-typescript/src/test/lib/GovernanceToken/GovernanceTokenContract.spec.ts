import { GovernanceTokenContract } from '../../../lib/GovernanceToken/GovernanceTokenContract';
import { createMockContext } from '../../mocks/fabric-mock';

// Simple unit tests for GovernanceTokenContract
describe('GovernanceTokenContract', () => {
  let contract: GovernanceTokenContract;
  
  beforeEach(() => {
    createMockContext(); // Create context but don't store it since we're not using it
    contract = new GovernanceTokenContract();
  });
  
  describe('constructor', () => {
    it('should create a contract with the correct name', () => {
      expect(contract.getName()).toBe('GovernanceTokenContract');
    });
  });
}); 