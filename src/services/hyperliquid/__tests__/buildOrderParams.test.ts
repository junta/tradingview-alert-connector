jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configMap: Record<string, any> = {
			'Hyperliquid.Network.host': 'https://api.hyperliquid.xyz',
			'Hyperliquid.User.slippage': 0.05
		};
		return configMap[key];
	}),
	util: {
		getEnv: jest.fn(() => 'development')
	}
}));

jest.mock('../../../helper', () => ({
	getStrategiesDB: jest.fn(() => {
		const mockDb = { push: jest.fn() };
		const mockData: Record<string, any> = {
			TestStrategy: { isFirstOrder: 'false', position: 0.5 }
		};
		return [mockDb, mockData];
	})
}));

const mockGetMeta = jest.fn();
const mockGetAllMids = jest.fn();
const mockGetAccountState = jest.fn();

jest.mock('../client', () => ({
	__esModule: true,
	default: {
		build: jest.fn(() => ({
			getMeta: mockGetMeta,
			getAllMids: mockGetAllMids,
			getAccountState: mockGetAccountState
		}))
	}
}));

import { hyperliquidBuildOrderParams } from '../buildOrderParams';
import { AlertObject } from '../../../types';

describe('hyperliquidBuildOrderParams', () => {
	beforeEach(() => {
		mockGetMeta.mockResolvedValue({
			universe: [
				{ name: 'BTC', szDecimals: 5 },
				{ name: 'ETH', szDecimals: 4 }
			]
		});
		mockGetAllMids.mockResolvedValue({
			BTC: '50000.0',
			ETH: '3000.0'
		});
		mockGetAccountState.mockResolvedValue({
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
			const result = await hyperliquidBuildOrderParams(baseAlert);
			expect(result.coin).toBe('BTC');
		});

		it('normalizes "BTC-USD" to "BTC"', async () => {
			const alert = { ...baseAlert, market: 'BTC-USD' };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.coin).toBe('BTC');
		});

		it('normalizes "BTC-PERP" to "BTC"', async () => {
			const alert = { ...baseAlert, market: 'BTC-PERP' };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.coin).toBe('BTC');
		});

		it('normalizes "btc_usd" (lowercase) to "BTC"', async () => {
			const alert = { ...baseAlert, market: 'btc_usd' };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.coin).toBe('BTC');
		});

		it('normalizes "ETH_PERP" to "ETH"', async () => {
			const alert = { ...baseAlert, market: 'ETH_PERP', size: 1.0 };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.coin).toBe('ETH');
		});
	});

	describe('order side', () => {
		it('sets isBuy=true for buy orders', async () => {
			const result = await hyperliquidBuildOrderParams(baseAlert);
			expect(result.isBuy).toBe(true);
		});

		it('sets isBuy=false for sell orders', async () => {
			const alert = { ...baseAlert, order: 'sell' };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.isBuy).toBe(false);
		});
	});

	describe('order sizing', () => {
		it('uses fixed size from alert', async () => {
			const alert = { ...baseAlert, size: 0.05 };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.size).toBe('0.05000');
		});

		it('calculates size from sizeUsd', async () => {
			const alert = {
				...baseAlert,
				size: undefined,
				sizeUsd: 1000
			};
			const result = await hyperliquidBuildOrderParams(alert);
			// 1000 / 50000 = 0.02
			expect(result.size).toBe('0.02000');
		});

		it('calculates size from sizeByLeverage', async () => {
			const alert = {
				...baseAlert,
				size: undefined,
				sizeByLeverage: 2
			};
			const result = await hyperliquidBuildOrderParams(alert);
			// (10000 * 2) / 50000 = 0.4
			expect(result.size).toBe('0.40000');
		});

		it('doubles size for reverse orders on non-first orders', async () => {
			const alert = { ...baseAlert, size: 0.01, reverse: true };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.size).toBe('0.02000');
		});

		it('respects szDecimals rounding', async () => {
			const alert = {
				...baseAlert,
				market: 'ETH',
				size: 1.23456
			};
			const result = await hyperliquidBuildOrderParams(alert);
			// ETH has szDecimals=4, so should round to 4 decimals
			expect(result.size).toBe('1.2346');
		});
	});

	describe('price with slippage', () => {
		it('applies positive slippage for buy orders', async () => {
			const result = await hyperliquidBuildOrderParams(baseAlert);
			// 50000 * 1.05 = 52500
			expect(parseFloat(result.price)).toBe(52500);
		});

		it('applies negative slippage for sell orders', async () => {
			const alert = { ...baseAlert, order: 'sell' };
			const result = await hyperliquidBuildOrderParams(alert);
			// 50000 * 0.95 = 47500
			expect(parseFloat(result.price)).toBe(47500);
		});
	});

	describe('asset index', () => {
		it('resolves BTC to index 0', async () => {
			const result = await hyperliquidBuildOrderParams(baseAlert);
			expect(result.assetIndex).toBe(0);
		});

		it('resolves ETH to index 1', async () => {
			const alert = { ...baseAlert, market: 'ETH', size: 1.0 };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result.assetIndex).toBe(1);
		});
	});

	describe('error handling', () => {
		it('returns undefined when connector build fails', async () => {
			const clientMock = require('../client').default;
			clientMock.build.mockReturnValueOnce(null);
			const result = await hyperliquidBuildOrderParams(baseAlert);
			expect(result).toBeUndefined();
		});

		it('returns undefined for unknown asset', async () => {
			const alert = { ...baseAlert, market: 'UNKNOWN' };
			const result = await hyperliquidBuildOrderParams(alert);
			expect(result).toBeUndefined();
		});

		it('returns undefined when mid price is not available', async () => {
			mockGetAllMids.mockResolvedValueOnce({ ETH: '3000.0' });
			const result = await hyperliquidBuildOrderParams(baseAlert);
			expect(result).toBeUndefined();
		});
	});
});
