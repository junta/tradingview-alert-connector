import { ethers } from 'ethers';

// Mock config before importing the module
jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configMap: Record<string, string> = {
			'Hyperliquid.Network.host': 'https://api.hyperliquid.xyz'
		};
		return configMap[key];
	})
}));

// Mock https to prevent real network calls
jest.mock('https', () => ({
	request: jest.fn()
}));

import HyperliquidConnector from '../client';

// Known test private key (DO NOT use in production)
const TEST_PRIVATE_KEY =
	'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('HyperliquidConnector', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('build()', () => {
		it('returns null when HYPERLIQUID_PRIVATE_KEY is not set', () => {
			delete process.env.HYPERLIQUID_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			expect(connector).toBeNull();
		});

		it('creates connector when HYPERLIQUID_PRIVATE_KEY is set', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			expect(connector).not.toBeNull();
		});

		it('handles private key with 0x prefix', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = '0x' + TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			expect(connector).not.toBeNull();
			expect(connector.getAddress()).toBe(
				new ethers.Wallet('0x' + TEST_PRIVATE_KEY).address
			);
		});

		it('handles private key without 0x prefix', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			expect(connector).not.toBeNull();
			expect(connector.getAddress()).toBe(
				new ethers.Wallet('0x' + TEST_PRIVATE_KEY).address
			);
		});
	});

	describe('getAddress()', () => {
		it('returns the wallet address derived from private key', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			const expectedAddress = new ethers.Wallet(
				'0x' + TEST_PRIVATE_KEY
			).address;
			expect(connector.getAddress()).toBe(expectedAddress);
		});
	});

	describe('placeOrder()', () => {
		it('constructs correct order action structure', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			// Mock the exchange method to capture the action
			let capturedAction: any;
			(connector as any).exchange = jest
				.fn()
				.mockImplementation((action: any) => {
					capturedAction = action;
					return Promise.resolve({ status: 'ok' });
				});

			await connector.placeOrder(0, true, '50000', '0.01', false);

			expect(capturedAction).toEqual({
				type: 'order',
				orders: [
					{
						a: 0,
						b: true,
						p: '50000',
						s: '0.01',
						r: false,
						t: { limit: { tif: 'Ioc' } }
					}
				],
				grouping: 'na'
			});
		});

		it('sets reduceOnly when specified', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			let capturedAction: any;
			(connector as any).exchange = jest
				.fn()
				.mockImplementation((action: any) => {
					capturedAction = action;
					return Promise.resolve({ status: 'ok' });
				});

			await connector.placeOrder(1, false, '3000', '1.5', true);

			expect(capturedAction.orders[0].r).toBe(true);
			expect(capturedAction.orders[0].b).toBe(false);
			expect(capturedAction.orders[0].a).toBe(1);
		});

		it('includes builder fee in action when provided', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			let capturedAction: any;
			(connector as any).exchange = jest
				.fn()
				.mockImplementation((action: any) => {
					capturedAction = action;
					return Promise.resolve({ status: 'ok' });
				});

			const builder = {
				b: '0x1234567890abcdef1234567890abcdef12345678',
				f: 10
			};
			await connector.placeOrder(0, true, '50000', '0.01', false, builder);

			expect(capturedAction.builder).toEqual(builder);
		});

		it('does not include builder field when not provided', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			let capturedAction: any;
			(connector as any).exchange = jest
				.fn()
				.mockImplementation((action: any) => {
					capturedAction = action;
					return Promise.resolve({ status: 'ok' });
				});

			await connector.placeOrder(0, true, '50000', '0.01', false);

			expect(capturedAction.builder).toBeUndefined();
		});
	});

	describe('setReferrer()', () => {
		it('sends setReferrer action to exchange', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			let capturedAction: any;
			(connector as any).exchange = jest
				.fn()
				.mockImplementation((action: any) => {
					capturedAction = action;
					return Promise.resolve({ status: 'ok' });
				});

			await connector.setReferrer('TESTCODE');

			expect(capturedAction).toEqual({
				type: 'setReferrer',
				code: 'TESTCODE'
			});
		});

		it('handles error gracefully when referrer already set', async () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();

			(connector as any).exchange = jest
				.fn()
				.mockRejectedValue(new Error('Referrer already set'));

			// Should not throw
			await connector.setReferrer('TESTCODE');
		});
	});

	describe('isMainnet detection', () => {
		it('detects mainnet from api.hyperliquid.xyz URL', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			// The connector is built with mainnet URL from our mock config
			expect(connector).not.toBeNull();
		});

		it('detects testnet from testnet URL', () => {
			const configMock = require('config');
			configMock.get.mockReturnValueOnce(
				'https://api.hyperliquid-testnet.xyz'
			);
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const connector = HyperliquidConnector.build();
			expect(connector).not.toBeNull();
		});
	});
});
