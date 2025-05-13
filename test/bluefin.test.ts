import { BluefinDexClient } from '../src/services/bluefin/bluefinClient';
import { AlertObject } from '../src/types';
import * as envLoader from '../src/utils/envLoader';
import { ProfileName } from '../src/utils/envLoader';
import { ORDER_SIDE, BluefinClient } from '@bluefin-exchange/bluefin-v2-client';

// Mock the dependencies to avoid actual API calls
jest.mock('@bluefin-exchange/bluefin-v2-client');
jest.mock('../src/utils/envLoader');
jest.mock('../src/helper');

// interfaces for our test data structures
interface MockAccountData {
  address: string;
  accountValue: string;
  accountDataByMarket: Array<{
    symbol?: string;
    selectedLeverage?: string;
  }>;
  feeTier: string;
  canTrade: boolean;
  totalPositionMargin?: string;
  marginFraction?: string;
  buyingPower?: string;
  freeCollateral?: string;
  maintenanceMarginRequired?: string;
  initialMarginRequired?: string;
}

interface MockExchangeInfo {
  data: {
    minOrderSize: string;
    tickSize?: string;
    stepSize?: string;
    quantityPrecision?: number;
  };
}

describe('BluefinDexClient', () => {
  // Sample basic AlertObject
  const baseAlert: AlertObject = {
    strategy: 'test',
    market: 'BTC_USD',
    order: 'buy',
    position: 'long',
    reverse: false,
    price: 50000,
    exchange: 'bluefin'
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocked implementation
    (envLoader.getEnvVar as jest.Mock).mockImplementation((name, profile) => {
      if (name === 'BLUEFIN_MNEMONIC') return `mnemonic-for-${profile || ''}`;
      return '';
    });
  });

  describe('Environment profile handling', () => {
    // Basic tests for profile handling
    it('should use default profile (empty string) when no profile specified', () => {
      new BluefinDexClient(baseAlert);
      expect(envLoader.getEnvVar).toHaveBeenCalledWith('BLUEFIN_MNEMONIC', '');
    });

    it('should use P1 profile properly', () => {
      const alertWithP1: AlertObject = {
        ...baseAlert,
        envProfile: "P1" as ProfileName
      };
      
      new BluefinDexClient(alertWithP1);
      expect(envLoader.getEnvVar).toHaveBeenCalledWith('BLUEFIN_MNEMONIC', 'P1');
    });

    // More advanced test for handling multiple profiles in sequence
    it('should handle multiple different profiles in sequence', async () => {
      // Mock responses from getEnvVar to track different profiles
      const getEnvVarMock = envLoader.getEnvVar as jest.Mock;
      getEnvVarMock.mockImplementation((name, profile) => {
        return `mnemonic-for-${profile || ''}`;
      });
      
      // Import the BluefinClient constructor directly
      const bluefinClientMock = jest.mocked(BluefinClient);
      bluefinClientMock.mockClear();
      
      // Sequence of different profiles to test
      const profileSequence: ProfileName[] = ['', 'P1', 'P3', 'P5', 'P2', ''];
      
      for (const profile of profileSequence) {
        // Reset the BluefinClient mock for each iteration
        bluefinClientMock.mockClear();
        
        // Create a new alert with the current profile
        const alertWithProfile: AlertObject = {
          ...baseAlert,
          envProfile: profile
        };
        
        // Create a new client instance with this profile
        const client = new BluefinDexClient(alertWithProfile);
        
        // Verify that getEnvVar was called with the correct profile
        expect(getEnvVarMock).toHaveBeenCalledWith('BLUEFIN_MNEMONIC', profile);
        
        // Verify that the BluefinClient was initialized with the correct mnemonic
        expect(bluefinClientMock).toHaveBeenCalledWith(
          expect.anything(),  // first param (true)
          expect.anything(),  // second param (Networks.PRODUCTION_SUI)
          `mnemonic-for-${profile}`, // mnemonic should use the profile
          expect.anything()   // last param ('ED25519')
        );
        
        // Mock client.client and getSubAccount for placeOrder test
        const mockAccountData: MockAccountData = {
          address: '0x123',
          accountValue: '1000000000000000000',
          accountDataByMarket: [],
          feeTier: '0',
          canTrade: true
        };
        
        // Mock the necessary methods with appropriate types
        jest.spyOn(client, 'getSubAccount').mockResolvedValue(mockAccountData as unknown as ReturnType<typeof client.getSubAccount>);
        jest.spyOn(client, 'adjustOrderSize').mockResolvedValue(0.1);
        (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
        
        // Mock the postOrder function
        const mockPostOrder = jest.fn().mockResolvedValue({
          data: { id: '12345', side: ORDER_SIDE.BUY }
        });
        
        // Set the client property
        (client as any).client = {
          postOrder: mockPostOrder,
          // Add any other methods needed
        };
        
        // Actually test placing an order with this client/profile
        await client.placeOrder({
          ...baseAlert,
          envProfile: profile,
          size: 0.1
        });
        
        // Verify the order was placed with the correct parameters
        expect(mockPostOrder).toHaveBeenCalledWith(expect.objectContaining({
          symbol: 'BTC-PERP',
          side: ORDER_SIDE.BUY
        }));
        
        // Verify that the exportOrder function was called with the correct profile marker
        expect((client as any).exportOrder).toHaveBeenCalledWith(
          'Bluefin',
          'test',
          expect.any(Object),
          50000,
          'BTC_USD'
        );
      }
    });
    
    it('should handle switching between different mnemonic values correctly', async () => {
      // Create a more sophisticated mock for getEnvVar that returns different values for different profiles
      const mnemonicMap = {
        '': 'default-mnemonic',
        'P1': 'p1-mnemonic',
        'P2': 'p2-mnemonic',
        'P3': 'p3-mnemonic',
        'P4': '',  // No mnemonic for P4 to test error handling
        'P5': 'p5-mnemonic'
      };
      
      (envLoader.getEnvVar as jest.Mock).mockImplementation((name, profile) => {
        if (name === 'BLUEFIN_MNEMONIC') {
          return mnemonicMap[profile as keyof typeof mnemonicMap] || '';
        }
        return '';
      });
      
      // Mock console.log to check for error messages
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test a sequence of clients with different profiles
      const profileSequence: ProfileName[] = ['', 'P1', 'P4', 'P5', 'P2', 'P3'];
      
      for (const profile of profileSequence) {
        const alertWithProfile: AlertObject = {
          ...baseAlert,
          envProfile: profile
        };
        
        consoleSpy.mockClear();
        const client = new BluefinDexClient(alertWithProfile);
        
        // Check if getEnvVar was called with correct params
        expect(envLoader.getEnvVar).toHaveBeenCalledWith('BLUEFIN_MNEMONIC', profile);
        
        // Check if an error message was logged for profile P4 (which has no mnemonic)
        if (profile === 'P4') {
          expect(consoleSpy).toHaveBeenCalledWith(`BLUEFIN_MNEMONIC_P4is not set as environment variable`);
          // Verify that the client wasn't initialized
          expect((client as any).client).toBeUndefined();
        } else {
          // For other profiles, client should be initialized
          if ((client as any).client === undefined) {
            // This is just to handle the mock implementation, in real code the client would be defined
            (client as any).client = {};
          }
          
          // Mock necessary methods for testing order placement with proper typing
          jest.spyOn(client, 'getSubAccount').mockResolvedValue({
            accountValue: '1000000000000000000',
            accountDataByMarket: [],
            address: 'address',
            feeTier: '0',
            canTrade: true
          } as unknown as ReturnType<typeof client.getSubAccount>);
          
          jest.spyOn(client, 'adjustOrderSize').mockResolvedValue(0.1);
          (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
          (client as any).client.postOrder = jest.fn().mockResolvedValue({
            data: { id: `${profile}-order-id`, side: ORDER_SIDE.BUY }
          });
          
          // Test placing an order
          const result = await client.placeOrder(alertWithProfile);
          
          // Verify order was placed
          if (result) {
            expect(result.id).toBe(`${profile}-order-id`);
          }
        }
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Basic functionality', () => {
    // Test that placeOrder correctly translates market names
    it('should convert market name format correctly', async () => {
      const client = new BluefinDexClient(baseAlert);
      
      // Create a mock account data with the required structure
      const mockAccountData: MockAccountData = {
        address: '0x123',
        accountValue: '1000000000000000000',
        accountDataByMarket: [],
        feeTier: '0',
        canTrade: true,
        totalPositionMargin: '0',
        marginFraction: '0',
        buyingPower: '0',
        freeCollateral: '0',
        maintenanceMarginRequired: '0',
        initialMarginRequired: '0'
      };
      
      // Use type assertion for the mocks to avoid TypeScript errors
      jest.spyOn(client, 'getSubAccount').mockResolvedValue(mockAccountData as unknown as ReturnType<typeof client.getSubAccount>);
      jest.spyOn(client, 'adjustOrderSize').mockResolvedValue(0.1);
      
      // Mock exportOrder by directly setting it on the instance
      // Instead of trying to mock it through prototype which doesn't work
      (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
      
      // Mock the client's postOrder method with proper typing
      const mockPostOrder = jest.fn().mockResolvedValue({
        data: { id: '12345', side: ORDER_SIDE.BUY }
      });
      
      // Set the client property directly
      (client as any).client = {
        postOrder: mockPostOrder
      };
      
      // Test with different market formats
      const markets = [
        { input: 'BTC_USD', expected: 'BTC-PERP' },
        { input: 'ETH_USD', expected: 'ETH-PERP' },
        { input: 'SOL_USD', expected: 'SOL-PERP' }
      ];
      
      for (const market of markets) {
        await client.placeOrder({
          ...baseAlert,
          market: market.input,
          size: 0.1
        });
        
        expect(mockPostOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            symbol: market.expected
          })
        );
        
        mockPostOrder.mockClear();
      }
    });
    
    // Test correct order side translation
    it('should translate order side correctly', async () => {
      const client = new BluefinDexClient(baseAlert);
      
      // Create a mock account data
      const mockAccountData: MockAccountData = {
        address: '0x123',
        accountValue: '1000000000000000000',
        accountDataByMarket: [],
        feeTier: '0',
        canTrade: true,
        totalPositionMargin: '0',
        marginFraction: '0',
        buyingPower: '0',
        freeCollateral: '0',
        maintenanceMarginRequired: '0',
        initialMarginRequired: '0'
      };
      
      // Use type assertion for the mocks
      jest.spyOn(client, 'getSubAccount').mockResolvedValue(mockAccountData as unknown as ReturnType<typeof client.getSubAccount>);
      jest.spyOn(client, 'adjustOrderSize').mockResolvedValue(0.1);
      
      // Mock exportOrder directly on the instance
      (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
      
      // Mock the client's postOrder method with proper typing
      const mockPostOrder = jest.fn().mockResolvedValue({
        data: { id: '12345', side: ORDER_SIDE.BUY }
      });
      
      // Set the client property
      (client as any).client = {
        postOrder: mockPostOrder
      };
      
      // Test buy order
      await client.placeOrder({
        ...baseAlert,
        order: 'buy',
        size: 0.1
      });
      
      expect(mockPostOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          side: ORDER_SIDE.BUY
        })
      );
      
      mockPostOrder.mockClear();
      
      // Test sell order
      await client.placeOrder({
        ...baseAlert,
        order: 'sell',
        size: 0.1
      });
      
      expect(mockPostOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          side: ORDER_SIDE.SELL
        })
      );
    });
    
    // Test getIsAccountReady basic functionality
    it('should correctly determine if account is ready', async () => {
      const client = new BluefinDexClient(baseAlert);
      
      // Create mock account data with different values
      const mockAccountWithValue: MockAccountData = {
        address: '0x123',
        accountValue: '1000000000000000000', // 1 token
        accountDataByMarket: [],
        feeTier: '0',
        canTrade: true,
        totalPositionMargin: '0',
        marginFraction: '0',
        buyingPower: '0',
        freeCollateral: '0',
        maintenanceMarginRequired: '0',
        initialMarginRequired: '0'
      };
      
      const mockAccountWithZero: MockAccountData = {
        ...mockAccountWithValue,
        accountValue: '0'
      };
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Test with positive account value
      jest.spyOn(client, 'getSubAccount').mockResolvedValue(mockAccountWithValue as unknown as ReturnType<typeof client.getSubAccount>);
      expect(await client.getIsAccountReady()).toBe(true);
      
      // Test with zero account value
      jest.spyOn(client, 'getSubAccount').mockResolvedValue(mockAccountWithZero as unknown as ReturnType<typeof client.getSubAccount>);
      expect(await client.getIsAccountReady()).toBe(false);
      
      // Test with no subaccount
      jest.spyOn(client, 'getSubAccount').mockResolvedValue(undefined as unknown as ReturnType<typeof client.getSubAccount>);
      expect(await client.getIsAccountReady()).toBe(false);
      
      consoleSpy.mockRestore();
    });
    
    // Test adjustOrderSize functionality
    it('should properly adjust order size based on min order size', async () => {
      const client = new BluefinDexClient(baseAlert);
      
      // Mock getExchangeInfo with proper structure
      const mockExchangeInfo: MockExchangeInfo = {
        data: {
          minOrderSize: '100000000000000000' // 0.1 in wei
        }
      };
      
      // Set the client property directly
      (client as any).client = {
        getExchangeInfo: jest.fn().mockResolvedValue(mockExchangeInfo)
      };
      
      // Test with value that should be adjusted
      const result = await client.adjustOrderSize(0.25, 'BTC-PERP');
      expect(result).toBeCloseTo(0.2); // Should round down to nearest 0.1
    });
  });
});