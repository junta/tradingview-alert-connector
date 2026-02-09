jest.mock('../src/helper', () => ({
	getStrategiesDB: jest.fn(() => {
		const mockData: Record<string, any> = {};
		const mockDb = {
			push: jest.fn((path: string, value: any) => {
				const parts = path.split('/').filter(Boolean);
				let current = mockData;
				for (let i = 0; i < parts.length - 1; i++) {
					if (!current[parts[i]]) current[parts[i]] = {};
					current = current[parts[i]];
				}
				current[parts[parts.length - 1]] = value;
			})
		};
		return [mockDb, mockData];
	})
}));

jest.mock('../src/services/dexRegistry', () => ({
	DexRegistry: jest.fn().mockImplementation(() => ({
		getAllDexKeys: jest.fn(() => [
			'dydxv4',
			'dydx',
			'perpetual',
			'gmx',
			'bluefin',
			'hyperliquid'
		])
	}))
}));

import { validateAlert } from '../src/services/validateAlert';
import { AlertObject } from '../src/types';

describe('validateAlert', () => {
	const baseAlert: AlertObject = {
		exchange: 'dydx',
		strategy: 'TestStrategy',
		market: 'BTC-USD',
		size: 0.1,
		order: 'buy',
		price: 50000,
		position: 'long',
		reverse: false
	};

	describe('exchange validation', () => {
		it('accepts "dydx" as valid exchange', async () => {
			const result = await validateAlert({ ...baseAlert, exchange: 'dydx' });
			expect(result).toBe(true);
		});

		it('accepts "perpetual" as valid exchange', async () => {
			const result = await validateAlert({
				...baseAlert,
				exchange: 'perpetual'
			});
			expect(result).toBe(true);
		});

		it('accepts "hyperliquid" as valid exchange', async () => {
			const result = await validateAlert({
				...baseAlert,
				exchange: 'hyperliquid'
			});
			expect(result).toBe(true);
		});

		it('rejects invalid exchange name', async () => {
			const result = await validateAlert({
				...baseAlert,
				exchange: 'binance'
			});
			expect(result).toBe(false);
		});
	});

	describe('passphrase validation', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('passes when no passphrase is configured', async () => {
			(process.env as any).TRADINGVIEW_PASSPHRASE = undefined;
			const result = await validateAlert(baseAlert);
			expect(result).toBe(true);
		});

		it('rejects when passphrase is configured but not in alert', async () => {
			(process.env as any).TRADINGVIEW_PASSPHRASE = 'secret';
			const alert = { ...baseAlert, passphrase: undefined };
			const result = await validateAlert(alert);
			expect(result).toBe(false);
		});

		it('rejects when passphrase does not match', async () => {
			(process.env as any).TRADINGVIEW_PASSPHRASE = 'secret';
			const result = await validateAlert({
				...baseAlert,
				passphrase: 'wrong'
			});
			expect(result).toBe(false);
		});

		it('accepts when passphrase matches', async () => {
			(process.env as any).TRADINGVIEW_PASSPHRASE = 'secret';
			const result = await validateAlert({
				...baseAlert,
				passphrase: 'secret'
			});
			expect(result).toBe(true);
		});
	});

	describe('field validation', () => {
		it('rejects empty strategy', async () => {
			const result = await validateAlert({
				...baseAlert,
				strategy: ''
			});
			expect(result).toBe(false);
		});

		it('rejects invalid order side', async () => {
			const result = await validateAlert({
				...baseAlert,
				order: 'long' as any
			});
			expect(result).toBe(false);
		});

		it('rejects invalid position', async () => {
			const result = await validateAlert({
				...baseAlert,
				position: 'buy' as any
			});
			expect(result).toBe(false);
		});

		it('accepts valid positions: long, short, flat', async () => {
			for (const pos of ['long', 'short', 'flat']) {
				const result = await validateAlert({
					...baseAlert,
					position: pos
				});
				if (pos !== 'flat') {
					expect(result).toBe(true);
				}
			}
		});

		it('rejects non-boolean reverse field', async () => {
			const result = await validateAlert({
				...baseAlert,
				reverse: 'true' as any
			});
			expect(result).toBe(false);
		});

		it('rejects empty JSON body', async () => {
			const result = await validateAlert({} as AlertObject);
			expect(result).toBe(false);
		});
	});
});
