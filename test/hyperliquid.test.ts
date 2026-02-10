import { ethers } from 'ethers';
import * as fs from 'fs';
import config from 'config';

jest.mock('fs');
jest.mock('@nktkas/hyperliquid', () => ({
	HttpTransport: jest.fn(),
	InfoClient: jest.fn(),
	ExchangeClient: jest.fn()
}));

jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configMap: Record<string, any> = {
			'Hyperliquid.Network.host': 'https://api.hyperliquid.xyz',
			'Hyperliquid.User.slippage': 0.05,
			'Hyperliquid.User.builderFee': 5
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
	HyperliquidHelper,
	HyperliquidClient
} from '../src/services/hyperliquid/hyperliquidClient';
import { AlertObject } from '../src/types';

const TEST_PRIVATE_KEY =
	'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('HyperliquidHelper', () => {
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
			const helper = HyperliquidHelper.build();
			expect(helper).toBeNull();
		});

		it('creates helper when HYPERLIQUID_PRIVATE_KEY is set', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper).not.toBeNull();
		});

		it('handles private key with 0x prefix', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = '0x' + TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper).not.toBeNull();
			expect(helper.address).toBe(
				new ethers.Wallet('0x' + TEST_PRIVATE_KEY).address
			);
		});

		it('handles private key without 0x prefix', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper).not.toBeNull();
			expect(helper.address).toBe(
				new ethers.Wallet('0x' + TEST_PRIVATE_KEY).address
			);
		});

		it('provides info and exchange clients', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper.info).toBeDefined();
			expect(helper.exchange).toBeDefined();
		});
	});

	describe('address', () => {
		it('returns the wallet address derived from private key', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			const expectedAddress = new ethers.Wallet(
				'0x' + TEST_PRIVATE_KEY
			).address;
			expect(helper.address).toBe(expectedAddress);
		});
	});

	describe('testnet detection', () => {
		it('detects mainnet from api.hyperliquid.xyz URL', () => {
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper).not.toBeNull();
		});

		it('detects testnet from testnet URL', () => {
			const configMock = require('config');
			configMock.get.mockReturnValueOnce(
				'https://api.hyperliquid-testnet.xyz'
			);
			process.env.HYPERLIQUID_PRIVATE_KEY = TEST_PRIVATE_KEY;
			const helper = HyperliquidHelper.build();
			expect(helper).not.toBeNull();
		});
	});
});

describe('HyperliquidClient', () => {
	let client: HyperliquidClient;
	let mockHelper: any;
	let buildSpy: jest.SpyInstance;

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };

		client = new HyperliquidClient();

		mockHelper = {
			info: {
				meta: jest.fn(),
				allMids: jest.fn(),
				clearinghouseState: jest.fn(),
				spotClearinghouseState: jest.fn().mockResolvedValue({ balances: [] })
			},
			exchange: {
				order: jest.fn(),
				setReferrer: jest.fn()
			},
			address: new ethers.Wallet('0x' + TEST_PRIVATE_KEY).address
		};
		buildSpy = jest
			.spyOn(HyperliquidHelper, 'build')
			.mockReturnValue(mockHelper);

		(fs.existsSync as jest.Mock).mockReturnValue(true);
		(fs.appendFileSync as jest.Mock).mockImplementation(() => {});
	});

	afterEach(() => {
		buildSpy.mockRestore();
		process.env = originalEnv;
	});

	describe('getIsAccountReady', () => {
		it('returns true when perps account has positive value', async () => {
			mockHelper.info.clearinghouseState.mockResolvedValue({
				marginSummary: { accountValue: '1500.50' }
			});

			const result = await client.getIsAccountReady();
			expect(result).toBe(true);
		});

		it('returns true when only spot has balance', async () => {
			mockHelper.info.clearinghouseState.mockResolvedValue({
				marginSummary: { accountValue: '0' }
			});
			mockHelper.info.spotClearinghouseState.mockResolvedValue({
				balances: [
					{ coin: 'USDC', total: '4.985908', hold: '0.0' }
				]
			});

			const result = await client.getIsAccountReady();
			expect(result).toBe(true);
		});

		it('returns false when both perps and spot are zero', async () => {
			mockHelper.info.clearinghouseState.mockResolvedValue({
				marginSummary: { accountValue: '0' }
			});
			mockHelper.info.spotClearinghouseState.mockResolvedValue({
				balances: [
					{ coin: 'USDC', total: '0.0', hold: '0.0' }
				]
			});

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});

		it('returns false when helper build fails', async () => {
			buildSpy.mockReturnValueOnce(null);

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});

		it('returns false on API error', async () => {
			mockHelper.info.clearinghouseState.mockRejectedValue(
				new Error('API error')
			);

			const result = await client.getIsAccountReady();
			expect(result).toBe(false);
		});

		it('passes user address to both clearinghouseState calls', async () => {
			mockHelper.info.clearinghouseState.mockResolvedValue({
				marginSummary: { accountValue: '1500.50' }
			});

			await client.getIsAccountReady();

			expect(mockHelper.info.clearinghouseState).toHaveBeenCalledWith({
				user: mockHelper.address
			});
			expect(mockHelper.info.spotClearinghouseState).toHaveBeenCalledWith({
				user: mockHelper.address
			});
		});
	});

	describe('buildOrderParams', () => {
		beforeEach(() => {
			mockHelper.info.meta.mockResolvedValue({
				universe: [
					{ name: 'BTC', szDecimals: 5 },
					{ name: 'ETH', szDecimals: 4 }
				]
			});
			mockHelper.info.allMids.mockResolvedValue({
				BTC: '50000.0',
				ETH: '3000.0'
			});
			mockHelper.info.clearinghouseState.mockResolvedValue({
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
			it('returns undefined when helper build fails', async () => {
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
				mockHelper.info.allMids.mockResolvedValueOnce({
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
			mockHelper.info.meta.mockResolvedValue({
				universe: [
					{ name: 'BTC', szDecimals: 5 },
					{ name: 'ETH', szDecimals: 4 }
				]
			});
			mockHelper.info.allMids.mockResolvedValue({
				BTC: '50000.0',
				ETH: '3000.0'
			});
			mockHelper.info.clearinghouseState.mockResolvedValue({
				marginSummary: { accountValue: '10000.0' }
			});
			mockHelper.exchange.order.mockResolvedValue(mockOrderResult);
		});

		it('places order successfully and returns result', async () => {
			const result = await client.placeOrder(baseAlert);
			expect(result).toEqual(mockOrderResult);
		});

		it('calls exchange.order with correct parameters', async () => {
			await client.placeOrder(baseAlert);

			expect(mockHelper.exchange.order).toHaveBeenCalledWith({
				orders: [
					{
						a: 0,
						b: true,
						p: '52500',
						s: '0.01000',
						r: false,
						t: { limit: { tif: 'Ioc' } }
					}
				],
				grouping: 'na',
				builder: {
					b: '0x0000000000000000000000000000000000000000',
					f: 5
				}
			});
		});

		it('calls setReferrer on first order', async () => {
			mockHelper.exchange.setReferrer.mockResolvedValue({ status: 'ok' });

			await client.placeOrder(baseAlert);

			expect(mockHelper.exchange.setReferrer).toHaveBeenCalledWith({
				code: '0XIBUKI'
			});
		});

		it('only attempts setReferrer once across multiple orders', async () => {
			mockHelper.exchange.setReferrer.mockResolvedValue({ status: 'ok' });

			await client.placeOrder(baseAlert);
			await client.placeOrder(baseAlert);

			expect(mockHelper.exchange.setReferrer).toHaveBeenCalledTimes(1);
		});

		it('includes builder fee when builderFee > 0', async () => {
			await client.placeOrder(baseAlert);

			expect(mockHelper.exchange.order).toHaveBeenCalledWith({
				orders: [
					{
						a: 0,
						b: true,
						p: '52500',
						s: '0.01000',
						r: false,
						t: { limit: { tif: 'Ioc' } }
					}
				],
				grouping: 'na',
				builder: {
					b: '0x0000000000000000000000000000000000000000',
					f: 5
				}
			});
		});

		it('does not include builder fee when builderFee is 0', async () => {
			(config.get as jest.Mock).mockImplementation((key: string) => {
				if (key === 'Hyperliquid.User.builderFee') return 0;
				const configMap: Record<string, any> = {
					'Hyperliquid.Network.host': 'https://api.hyperliquid.xyz',
					'Hyperliquid.User.slippage': 0.05
				};
				return configMap[key];
			});

			await client.placeOrder(baseAlert);

			expect(mockHelper.exchange.order).toHaveBeenCalledWith({
				orders: [
					{
						a: 0,
						b: true,
						p: '52500',
						s: '0.01000',
						r: false,
						t: { limit: { tif: 'Ioc' } }
					}
				],
				grouping: 'na'
			});
		});

		it('retries on failure up to maxTries', async () => {
			mockHelper.exchange.order
				.mockRejectedValueOnce(new Error('Network error'))
				.mockRejectedValueOnce(new Error('Network error'))
				.mockResolvedValueOnce(mockOrderResult);

			const result = await client.placeOrder(baseAlert);
			expect(result).toEqual(mockOrderResult);
			expect(mockHelper.exchange.order).toHaveBeenCalledTimes(3);
		});

		it('returns undefined after all retries fail', async () => {
			mockHelper.exchange.order.mockRejectedValue(
				new Error('Persistent error')
			);

			const result = await client.placeOrder(baseAlert);
			expect(result).toBeUndefined();
			expect(mockHelper.exchange.order).toHaveBeenCalledTimes(4);
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
				mockHelper.exchange.order.mockResolvedValue({
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
