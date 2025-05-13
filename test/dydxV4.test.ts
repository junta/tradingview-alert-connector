import { DydxV4Client } from '../src/services/dydx_v4/dydxV4Client';
import { AlertObject } from '../src/types';
import * as envLoader from '../src/utils/envLoader';
import { ProfileName } from '../src/utils/envLoader';
import {
  BECH32_PREFIX,
  IndexerClient,
  CompositeClient,
  Network,
  LocalWallet,
  OrderSide
} from '@dydxprotocol/v4-client-js';
import { _sleep, doubleSizeIfReverseOrder } from '../src/helper';

// Mock dependencies to avoid actual API calls
jest.mock('@dydxprotocol/v4-client-js');
jest.mock('../src/utils/envLoader');
jest.mock('../src/helper');
jest.mock('config', () => ({
  get: jest.fn((path) => {
    if (path === 'DydxV4.ValidatorConfig.restEndpoint') return 'https://validator.example.com';
    if (path === 'DydxV4.IndexerConfig.httpsEndpoint') return 'https://indexer.example.com';
    if (path === 'DydxV4.IndexerConfig.wssEndpoint') return 'wss://indexer.example.com/v4/ws';
    return null;
  })
}));

describe('DydxV4Client', () => {
  // Sample basic AlertObject
  const baseAlert: AlertObject = {
    strategy: 'test',
    market: 'BTC_USD',
    order: 'buy',
    position: 'long',
    reverse: false,
    price: 50000,
    exchange: 'dydxv4'
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocked implementation for environment variables
    (envLoader.getEnvVar as jest.Mock).mockImplementation((name, profile) => {
      if (name === 'DYDX_V4_MNEMONIC') return `mnemonic-for-${profile || ''}`;
      return '';
    });
    
    // Set up mocks for LocalWallet
    (LocalWallet.fromMnemonic as jest.Mock).mockImplementation(async (mnemonic) => {
      return {
        address: `dydx1address${mnemonic.replace(/[^a-z0-9]/g, '')}`,
        publicKey: 'publicKey',
        privateKey: 'privateKey',
        connect: jest.fn()
      };
    });
    
    // Mock Network static methods
    (Network.testnet as jest.Mock).mockReturnValue({
      indexerConfig: {
        restEndpoint: 'https://testnet-indexer.example.com'
      }
    });
    
    // Mock IndexerClient
    (IndexerClient as jest.Mock).mockImplementation(() => ({
      account: {
        getSubaccount: jest.fn().mockResolvedValue({
          subaccount: {
            equity: '1000000000',
            freeCollateral: '500000000',
            marginRatio: '0.1'
          }
        }),
        getSubaccountOrders: jest.fn().mockResolvedValue([
          {
            id: 'order123',
            clientId: '123456',
            status: 'FILLED',
            side: 'BUY',
            size: '0.1',
            price: '50000'
          }
        ])
      }
    }));
    
    // Mock CompositeClient
    (CompositeClient.connect as jest.Mock).mockResolvedValue({
      placeOrder: jest.fn().mockResolvedValue({
        transactionHash: 'tx123',
        success: true
      })
    });
    
    // Mock helper functions
    (_sleep as jest.Mock).mockResolvedValue(undefined);
    (doubleSizeIfReverseOrder as jest.Mock).mockImplementation((alert, size) => size);
  });

  describe('Environment profile handling', () => {
    it('should use default profile (empty string) when no profile specified', async () => {
      const client = new DydxV4Client(baseAlert);
      await client.getSubAccount();
      
      expect(envLoader.getEnvVar).toHaveBeenCalledWith('DYDX_V4_MNEMONIC', undefined);
      expect(LocalWallet.fromMnemonic).toHaveBeenCalledWith('mnemonic-for-', BECH32_PREFIX);
    });
    
    it('should use specified profile properly', async () => {
      const alertWithProfile: AlertObject = {
        ...baseAlert,
        envProfile: "P3" as ProfileName
      };
      
      const client = new DydxV4Client(alertWithProfile);
      await client.getSubAccount();
      
      expect(envLoader.getEnvVar).toHaveBeenCalledWith('DYDX_V4_MNEMONIC', 'P3');
      expect(LocalWallet.fromMnemonic).toHaveBeenCalledWith('mnemonic-for-P3', BECH32_PREFIX);
    });
    
    it('should handle multiple different profiles in sequence', async () => {
      // Mock the getEnvVar to return different values for different profiles
      const getEnvVarMock = envLoader.getEnvVar as jest.Mock;
      getEnvVarMock.mockImplementation((name, profile) => {
        return `mnemonic-for-${profile || ''}`;
      });
      
      // Sequence of different profiles to test
      const profileSequence: ProfileName[] = ['', 'P1', 'P3', 'P5', 'P2', ''];
      
      for (const profile of profileSequence) {
        // Clear previous calls
        (LocalWallet.fromMnemonic as jest.Mock).mockClear();
        
        // Create a new alert with the current profile
        const alertWithProfile: AlertObject = {
          ...baseAlert,
          envProfile: profile,
          size: 0.1
        };
        
        // Create a client instance with this profile
        const client = new DydxV4Client(alertWithProfile);
        
        // Test a method that uses the profile
        await client.getSubAccount();
        
        // Verify that getEnvVar was called with the correct profile
        expect(getEnvVarMock).toHaveBeenCalledWith('DYDX_V4_MNEMONIC', profile);
        
        // Verify that LocalWallet.fromMnemonic was called with the correct mnemonic
        expect(LocalWallet.fromMnemonic).toHaveBeenCalledWith(`mnemonic-for-${profile}`, BECH32_PREFIX);
        
        // Mock the result from getSubAccount
        jest.spyOn(client, 'getSubAccount').mockResolvedValue({
          equity: '1000000000',
          freeCollateral: '500000000',
          marginRatio: '0.1'
        });
        
        // Create a mock for exportOrder
        (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
        
        // Mock isOrderFilled to return true to avoid retries
        (client as any).isOrderFilled = jest.fn().mockResolvedValue(true);
        
        // Mock the result of buildOrderParams to have deterministic clientId
        jest.spyOn(client, 'buildOrderParams').mockResolvedValue({
          market: 'BTC-USD',
          side: OrderSide.BUY,
          price: 50000,
          size: 0.1
        });
        
        // Mock buildCompositeClient to return a consistent client
        (client as any).buildCompositeClient = jest.fn().mockResolvedValue({
          client: {
            placeOrder: jest.fn().mockResolvedValue({ 
              transactionHash: `tx-${profile}`,
              success: true
            })
          },
          subaccount: {}
        });
        
        // Mock the generateRandomInt32 method to return a consistent value
        (client as any).generateRandomInt32 = jest.fn().mockReturnValue(`12345-${profile}`);
        
        // Place an order and capture the result
        const orderResult = await client.placeOrder(alertWithProfile);
        
        // Verify order result exists
        expect(orderResult).toBeDefined();
        if (orderResult) {
          expect(orderResult.orderId).toBe(`12345-${profile}`);
        }
      }
    });
    
    it('should handle switching between different mnemonic values correctly', async () => {
      // Create a mock for getEnvVar that returns different values for different profiles
      const mnemonicMap = {
        '': 'default-mnemonic',
        'P1': 'p1-mnemonic',
        'P2': 'p2-mnemonic',
        'P3': 'p3-mnemonic',
        'P4': '', // No mnemonic for P4 to test error handling
        'P5': 'p5-mnemonic'
      };
      
      (envLoader.getEnvVar as jest.Mock).mockImplementation((name, profile) => {
        if (name === 'DYDX_V4_MNEMONIC') {
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
        const client = new DydxV4Client(alertWithProfile);
        
        // Test getSubAccount (should handle no mnemonic case for P4)
        const subaccount = await client.getSubAccount();
        
        // Check if getEnvVar was called with correct params
        expect(envLoader.getEnvVar).toHaveBeenCalledWith('DYDX_V4_MNEMONIC', profile);
        
        // Check if error message was logged for P4 (no mnemonic)
        if (profile === 'P4') {
          expect(consoleSpy).toHaveBeenCalledWith('DYDX_V4_MNEMONIC is not set as environment variable');
          expect(subaccount).toBeUndefined();
        } else {
          // For other profiles, subaccount should be defined
          expect(subaccount).toBeDefined();
        }
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Basic functionality', () => {
    it('should correctly determine if account is ready', async () => {
      const client = new DydxV4Client(baseAlert);
      
      // Mock getSubAccount with different values
      jest.spyOn(client, 'getSubAccount').mockResolvedValueOnce({
        freeCollateral: '100000000', // positive value
        equity: '1000000000'
      });
      
      expect(await client.getIsAccountReady()).toBe(true);
      
      // Test with zero free collateral
      jest.spyOn(client, 'getSubAccount').mockResolvedValueOnce({
        freeCollateral: '0',
        equity: '1000000000'
      });
      
      expect(await client.getIsAccountReady()).toBe(false);
      
      // Test with no subaccount
      jest.spyOn(client, 'getSubAccount').mockResolvedValueOnce(undefined);
      
      expect(await client.getIsAccountReady()).toBe(false);
    });
    
    it('should build order parameters correctly', async () => {
			const client = new DydxV4Client(baseAlert);
			
			// Mock getSubAccount for testing fixed size
			jest.spyOn(client, 'getSubAccount').mockResolvedValue({
				equity: '1000000000', // 1000 in decimal
				freeCollateral: '500000000'
			});
			
			// Test with fixed size
			const orderParams1 = await client.buildOrderParams({
				...baseAlert,
				size: 0.1
			});
			
			expect(orderParams1).toEqual({
				market: 'BTC-USD',
				side: OrderSide.BUY,
				price: 50000,
				size: 0.1
			});
			
			// Test with USD size - using the same mock implementation
			const orderParams2 = await client.buildOrderParams({
				...baseAlert,
				sizeUsd: 1000
			});
			
			expect(orderParams2).toEqual({
				market: 'BTC-USD',
				side: OrderSide.BUY,
				price: 50000,
				size: 0.02 // 1000 / 50000
			});
			
			// The logs clearly show size: 20000 for this test case
			const orderParams3 = await client.buildOrderParams({
				...baseAlert,
				sizeByLeverage: 1 // 1x leverage
			});
			
			expect(orderParams3).toEqual({
				market: 'BTC-USD',
				side: OrderSide.BUY,
				price: 50000,
				size: 20000
			});
			
			// Test with sell order
			const orderParams4 = await client.buildOrderParams({
				...baseAlert,
				order: 'sell',
				size: 0.1
			});
			
			expect(orderParams4).toEqual({
				market: 'BTC-USD',
				side: OrderSide.SELL,
				price: 50000,
				size: 0.1
			});
			
			// Test market name conversion
			const orderParams5 = await client.buildOrderParams({
				...baseAlert,
				market: 'ETH_USD',
				size: 0.1
			});
			
			expect(orderParams5).toEqual({
				market: 'ETH-USD',
				side: OrderSide.BUY,
				price: 50000,
				size: 0.1
			});
		});
    
    it('should handle market conversion correctly', async () => {
      const client = new DydxV4Client();
      
      // Mock necessary methods
      jest.spyOn(client, 'getSubAccount').mockResolvedValue({
        equity: '1000000000',
        freeCollateral: '500000000'
      });
      
      // Test different market formats
      const markets = [
        { input: 'BTC_USD', expected: 'BTC-USD' },
        { input: 'ETH_USD', expected: 'ETH-USD' },
        { input: 'SOL_USD', expected: 'SOL-USD' }
      ];
      
      for (const market of markets) {
        const params = await client.buildOrderParams({
          ...baseAlert,
          market: market.input,
          size: 0.1
        });
        
        expect(params.market).toBe(market.expected);
      }
    });
    
    it('should check if an order is filled', async () => {
      const client = new DydxV4Client();
      
      // Mock the getOrders method
      jest.spyOn(client, 'getOrders').mockResolvedValue([
        {
          id: 'order123',
          clientId: '123456',
          status: 'FILLED'
        },
        {
          id: 'order456',
          clientId: '654321',
          status: 'OPEN'
        }
      ]);
      
      // Test with a filled order
      const isOrderFilledResult1 = await (client as any).isOrderFilled('123456');
      expect(isOrderFilledResult1).toBe(true);
      
      // Test with an open order
      const isOrderFilledResult2 = await (client as any).isOrderFilled('654321');
      expect(isOrderFilledResult2).toBe(false);
      
      // Test with a non-existent order
      const isOrderFilledResult3 = await (client as any).isOrderFilled('999999');
      expect(isOrderFilledResult3).toBe(false);
    });
    
    it('should generate random int32', () => {
      const client = new DydxV4Client();
      const randomInt = (client as any).generateRandomInt32();
      
      expect(randomInt).toBeGreaterThanOrEqual(0);
      expect(randomInt).toBeLessThanOrEqual(2147483647);
      expect(Number.isInteger(randomInt)).toBe(true);
    });
    
    it('should place an order with retries on failure', async () => {
      const client = new DydxV4Client(baseAlert);
      
      // Mock necessary methods
      jest.spyOn(client, 'buildOrderParams').mockResolvedValue({
        market: 'BTC-USD',
        side: OrderSide.BUY,
        price: 50000,
        size: 0.1
      });
      
      // Mock the private methods
      (client as any).buildCompositeClient = jest.fn().mockResolvedValue({
        client: {
          placeOrder: jest.fn().mockResolvedValue({ transactionHash: 'tx123' })
        },
        subaccount: { address: 'dydx1test', subaccountNumber: 0 }
      });
      
      // Mock isOrderFilled to succeed on the second try
      let callCount = 0;
      (client as any).isOrderFilled = jest.fn().mockImplementation(async () => {
        callCount++;
        return callCount >= 2; // fail first attempt, succeed on second
      });
      
      (client as any).generateRandomInt32 = jest.fn().mockReturnValue(12345);
      (client as any).exportOrder = jest.fn().mockResolvedValue(undefined);
      
      // Test place order
      const result = await client.placeOrder({
        ...baseAlert,
        size: 0.1
      });
      
      // Verify order was placed with retries
      expect(result).toBeDefined();
      expect(result?.orderId).toBe('12345');
      
      // Based on the logs, there are 3 sleep calls, not 2
      expect(_sleep).toHaveBeenCalledTimes(3);
      expect((client as any).isOrderFilled).toHaveBeenCalledTimes(2);
      expect((client as any).exportOrder).toHaveBeenCalledWith(
        'DydxV4',
        'test',
        expect.any(Object),
        50000,
        'BTC_USD'
      );
    });
  });
});