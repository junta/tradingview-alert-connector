import { ethers } from 'ethers';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('https', () => ({ request: jest.fn() }));

jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configMap: Record<string, any> = {
			'Hyperliquid.Network.host': 'https://api.hyperliquid.xyz',
			'Hyperliquid.User.slippage': 0.05,
			'Hyperliquid.User.builderFee': 10
		};
		return configMap[key];
	}),
	util: {
		getEnv: jest.fn(() => 'development')
	}
}));

const mockDbPush = jest.fn();
jest.mock('../src/helper', () => ({
	getStrategiesDB: jest.fn(() => {
		const mockDb = { push: mockDbPush };
		const mockData: Record<string, any> = {
			TestStrategy: { isFirstOrder: 'false', position: 0.5 }
		};
		return [mockDb, mockData];
	}),
	_sleep: jest.fn(() => Promise.resolve())
}));

import {
	HyperliquidConnector,
	HyperliquidClient
} from '../src/services/hyperliquid/hyperliquidClient';
import { AlertObject } from '../src/types';

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

describe('HyperliquidClient', () => {
	let client: HyperliquidClient;
	let mockConnector: any;
	let buildSpy: jest.SpyInstance;

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };

		client = new HyperliquidClient();

		mockConnector = {
			getMeta: jest.fn(),
			getAllMids: jest.fn(),
			getAccountState: jest.fn(),
			placeOrder: jest.fn(),
			setReferrer: jest.fn()
		};
		buildSpy = jest
			.spyOn(HyperliquidConnector, 'build')
			.mockReturnValue(mockConnector);

		(fs.existsSync as jest.Mock).mockReturnValue(true);
		(fs.appendFileSync as jest.Mock).mockImplementation(() => {});
	});

	afterEach(() => {
		buildSpy.mockRestore();
		process.env = originalEnv;
	});

	describe('getIsAccountReady', () => {
		it('returns true when account has positive value', async () => {
			mockConnector.getAccountState.mockResolvedValue({
				marginSummary: { accountValue: '1500.50' }
			});

			const result = await client.getIsAccountReady();
			expect(result).toBe(true);
		});

		it('returns false when account value is zero', async () => {
			mockConnector.getAccountState.mockResolvedValue({
				marginSummary: { accountValue: '0' }
			});

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});

		it('returns false when connector build fails', async () => {
			buildSpy.mockReturnValueOnce(null);

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});

		it('returns false on API error', async () => {
			mockConnector.getAccountState.mockRejectedValue(
				new Error('API error')
			);

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});
	});

	describe('buildOrderParams', () => {
		beforeEach(() => {
			mockConnector.getMeta.mockResolvedValue({
				universe: [
					{ name: 'BTC', szDecimals: 5 },
					{ name: 'ETH', szDecimals: 4 }
				]
			});
			mockConnector.getAllMids.mockResolvedValue({
				BTC: '50000.0',
				ETH: '3000.0'
			});
			mockConnector.getAccountState.mockResolvedValue({
				marginSummary: { accountValue: '10000.0' }
			});
		});

		const baseAlert: AlertObject = {
			exchange: 'hyperliquid',
			strategy: 'TestStrategy',
			market: 'BTC',
			size: 0.01,
			order: 'buy',
			price: 50000,
			position: 'long',
			reverse: false
		};

		describe('market name normalization', () => {
			it('handles plain coin name "BTC"', async () => {
				const result = await client.buildOrderParams(baseAlert);
				expect(result.coin).toBe('BTC');
			});

			it('normalizes "BTC-USD" to "BTC"', async () => {
				const alert = { ...baseAlert, market: 'BTC-USD' };
				const result = await client.buildOrderParams(alert);
				expect(result.coin).toBe('BTC');
			});

			it('normalizes "BTC-PERP" to "BTC"', async () => {
				const alert = { ...baseAlert, market: 'BTC-PERP' };
				const result = await client.buildOrderParams(alert);
				expect(result.coin).toBe('BTC');
			});

			it('normalizes "btc_usd" (lowercase) to "BTC"', async () => {
				const alert = { ...baseAlert, market: 'btc_usd' };
				const result = await client.buildOrderParams(alert);
				expect(result.coin).toBe('BTC');
			});

			it('normalizes "ETH_PERP" to "ETH"', async () => {
				const alert = {
					...baseAlert,
					market: 'ETH_PERP',
					size: 1.0
				};
				const result = await client.buildOrderParams(alert);
				expect(result.coin).toBe('ETH');
			});
		});

		describe('order side', () => {
			it('sets isBuy=true for buy orders', async () => {
				const result = await client.buildOrderParams(baseAlert);
				expect(result.isBuy).toBe(true);
			});

			it('sets isBuy=false for sell orders', async () => {
				const alert = { ...baseAlert, order: 'sell' };
				const result = await client.buildOrderParams(alert);
				expect(result.isBuy).toBe(false);
			});
		});

		describe('order sizing', () => {
			it('uses fixed size from alert', async () => {
				const alert = { ...baseAlert, size: 0.05 };
				const result = await client.buildOrderParams(alert);
				expect(result.size).toBe('0.05000');
			});

			it('calculates size from sizeUsd', async () => {
				const alert = {
					...baseAlert,
					size: undefined,
					sizeUsd: 1000
				};
				const result = await client.buildOrderParams(alert);
				// 1000 / 50000 = 0.02
				expect(result.size).toBe('0.02000');
			});

			it('calculates size from sizeByLeverage', async () => {
				const alert = {
					...baseAlert,
					size: undefined,
					sizeByLeverage: 2
				};
				const result = await client.buildOrderParams(alert);
				// (10000 * 2) / 50000 = 0.4
				expect(result.size).toBe('0.40000');
			});

			it('doubles size for reverse orders on non-first orders', async () => {
				const alert = { ...baseAlert, size: 0.01, reverse: true };
				const result = await client.buildOrderParams(alert);
				expect(result.size).toBe('0.02000');
			});

			it('respects szDecimals rounding', async () => {
				const alert = {
					...baseAlert,
					market: 'ETH',
					size: 1.23456
				};
				const result = await client.buildOrderParams(alert);
				// ETH has szDecimals=4, so should round to 4 decimals
				expect(result.size).toBe('1.2346');
			});
		});

		describe('price with slippage', () => {
			it('applies positive slippage for buy orders', async () => {
				const result = await client.buildOrderParams(baseAlert);
				// 50000 * 1.05 = 52500
				expect(parseFloat(result.price)).toBe(52500);
			});

			it('applies negative slippage for sell orders', async () => {
				const alert = { ...baseAlert, order: 'sell' };
				const result = await client.buildOrderParams(alert);
				// 50000 * 0.95 = 47500
				expect(parseFloat(result.price)).toBe(47500);
			});
		});

		describe('asset index', () => {
			it('resolves BTC to index 0', async () => {
				const result = await client.buildOrderParams(baseAlert);
				expect(result.assetIndex).toBe(0);
			});

			it('resolves ETH to index 1', async () => {
				const alert = { ...baseAlert, market: 'ETH', size: 1.0 };
				const result = await client.buildOrderParams(alert);
				expect(result.assetIndex).toBe(1);
			});
		});

		describe('error handling', () => {
			it('returns undefined when connector build fails', async () => {
				buildSpy.mockReturnValueOnce(null);
				const result = await client.buildOrderParams(baseAlert);
				expect(result).toBeUndefined();
			});

			it('returns undefined for unknown asset', async () => {
				const alert = { ...baseAlert, market: 'UNKNOWN' };
				const result = await client.buildOrderParams(alert);
				expect(result).toBeUndefined();
			});

			it('returns undefined when mid price is not available', async () => {
				mockConnector.getAllMids.mockResolvedValueOnce({
					ETH: '3000.0'
				});
				const result = await client.buildOrderParams(baseAlert);
				expect(result).toBeUndefined();
			});
		});
	});

	describe('placeOrder', () => {
		const baseAlert: AlertObject = {
			exchange: 'hyperliquid',
			strategy: 'TestStrategy',
			market: 'BTC',
			size: 0.01,
			order: 'buy',
			price: 50000,
			position: 'long',
			reverse: false
		};

		const mockOrderResult = {
			status: 'ok',
			response: {
				type: 'order',
				data: {
					statuses: [
						{
							filled: {
								totalSz: '0.01',
								avgPx: '50100.0',
								oid: 12345
							}
						}
					]
				}
			}
		};

		beforeEach(() => {
			mockConnector.getMeta.mockResolvedValue({
				universe: [
					{ name: 'BTC', szDecimals: 5 },
					{ name: 'ETH', szDecimals: 4 }
				]
			});
			mockConnector.getAllMids.mockResolvedValue({
				BTC: '50000.0',
				ETH: '3000.0'
			});
			mockConnector.getAccountState.mockResolvedValue({
				marginSummary: { accountValue: '10000.0' }
			});
			mockConnector.placeOrder.mockResolvedValue(mockOrderResult);
		});

		it('places order successfully and returns result', async () => {
			const result = await client.placeOrder(baseAlert);
			expect(result).toEqual(mockOrderResult);
		});

		it('calls setReferrer on first order when HYPERLIQUID_REFERRAL_CODE is set', async () => {
			process.env.HYPERLIQUID_REFERRAL_CODE = 'MYCODE';
			mockConnector.setReferrer.mockResolvedValue({ status: 'ok' });

			await client.placeOrder(baseAlert);

			expect(mockConnector.setReferrer).toHaveBeenCalledWith('MYCODE');
		});

		it('does not call setReferrer when HYPERLIQUID_REFERRAL_CODE is not set', async () => {
			delete process.env.HYPERLIQUID_REFERRAL_CODE;

			await client.placeOrder(baseAlert);

			expect(mockConnector.setReferrer).not.toHaveBeenCalled();
		});

		it('only attempts setReferrer once across multiple orders', async () => {
			process.env.HYPERLIQUID_REFERRAL_CODE = 'MYCODE';
			mockConnector.setReferrer.mockResolvedValue({ status: 'ok' });

			await client.placeOrder(baseAlert);
			await client.placeOrder(baseAlert);

			expect(mockConnector.setReferrer).toHaveBeenCalledTimes(1);
		});

		it('includes builder fee when HYPERLIQUID_BUILDER_ADDRESS is set', async () => {
			process.env.HYPERLIQUID_BUILDER_ADDRESS =
				'0x1234567890abcdef1234567890abcdef12345678';

			await client.placeOrder(baseAlert);

			expect(mockConnector.placeOrder).toHaveBeenCalledWith(
				0,
				true,
				'52500',
				'0.01000',
				false,
				{
					b: '0x1234567890abcdef1234567890abcdef12345678',
					f: 10
				}
			);
		});

		it('does not include builder fee when HYPERLIQUID_BUILDER_ADDRESS is not set', async () => {
			delete process.env.HYPERLIQUID_BUILDER_ADDRESS;

			await client.placeOrder(baseAlert);

			expect(mockConnector.placeOrder).toHaveBeenCalledWith(
				0,
				true,
				'52500',
				'0.01000',
				false,
				undefined
			);
		});

		it('retries on failure up to maxTries', async () => {
			mockConnector.placeOrder
				.mockRejectedValueOnce(new Error('Network error'))
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockOrderResult);

			const result = await client.placeOrder(baseAlert);
			expect(result).toEqual(mockOrderResult);
			expect(mockConnector.placeOrder).toHaveBeenCalledTimes(3);
		});

		it('returns undefined on Hyperliquid error response after retries', async () => {
			mockConnector.placeOrder.mockResolvedValue({
				status: 'err',
				response: 'Insufficient margin'
			});

			const result = await client.placeOrder(baseAlert);
			expect(result).toBeUndefined();
			expect(mockConnector.placeOrder).toHaveBeenCalledTimes(4);
		});

		describe('trade history export', () => {
			it('marks strategy as not first order', async () => {
				await client.placeOrder(baseAlert);

				expect(mockDbPush).toHaveBeenCalledWith(
					'/TestStrategy/isFirstOrder',
					'false'
				);
			});

			it('stores position data for buy orders', async () => {
				await client.placeOrder(baseAlert);

				// position = storedSize (0.5) + orderSize (0.01) = 0.51
				expect(mockDbPush).toHaveBeenCalledWith(
					'/TestStrategy/position',
					0.51
				);
			});

			it('stores negative position data for sell orders', async () => {
				const alert = { ...baseAlert, order: 'sell' };
				await client.placeOrder(alert);

				// position = storedSize (0.5) + (-0.01) = 0.49
				expect(mockDbPush).toHaveBeenCalledWith(
					'/TestStrategy/position',
					0.49
				);
			});

			it('creates export directory if it does not exist', async () => {
				(fs.existsSync as jest.Mock)
					.mockReturnValueOnce(false) // folder doesn't exist
					.mockReturnValueOnce(false); // file doesn't exist

				await client.placeOrder(baseAlert);

				expect(fs.mkdirSync).toHaveBeenCalledWith(
					expect.stringContaining('data/exports/'),
					{ recursive: true }
				);
			});

			it('creates CSV with headers if file does not exist', async () => {
				(fs.existsSync as jest.Mock)
					.mockReturnValueOnce(true) // folder exists
					.mockReturnValueOnce(false); // file doesn't exist

				await client.placeOrder(baseAlert);

				expect(fs.writeFileSync).toHaveBeenCalledWith(
					expect.stringContaining('tradeHistoryHyperliquid.csv'),
					'datetime,strategy,market,side,size,avgPrice,tradingviewPrice,priceGap,status,orderId'
				);
			});

			it('appends trade data to CSV', async () => {
				await client.placeOrder(baseAlert);

				expect(fs.appendFileSync).toHaveBeenCalledWith(
					expect.stringContaining('tradeHistoryHyperliquid.csv'),
					expect.stringContaining(
						'TestStrategy,BTC,BUY,0.01,50100.0,50000'
					)
				);
			});

			it('records FILLED status for filled orders', async () => {
				await client.placeOrder(baseAlert);

				expect(fs.appendFileSync).toHaveBeenCalledWith(
					expect.any(String),
					expect.stringContaining('FILLED')
				);
			});

			it('records FAILED status when no fill data', async () => {
				mockConnector.placeOrder.mockResolvedValue({
					status: 'ok',
					response: {
						data: { statuses: [{ error: 'no liquidity' }] }
					}
				});

				await client.placeOrder(baseAlert);

				expect(fs.appendFileSync).toHaveBeenCalledWith(
					expect.any(String),
					expect.stringContaining('FAILED')
				);
			});
		});
	});
});
