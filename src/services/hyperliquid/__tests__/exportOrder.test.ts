import * as fs from 'fs';

jest.mock('fs');
jest.mock('config', () => ({
	get: jest.fn(),
	util: {
		getEnv: jest.fn(() => 'development')
	}
}));

const mockDbPush = jest.fn();
jest.mock('../../../helper', () => ({
	getStrategiesDB: jest.fn(() => {
		const mockDb = { push: mockDbPush };
		const mockData: Record<string, any> = {
			TestStrategy: { isFirstOrder: 'true', position: 0.5 }
		};
		return [mockDb, mockData];
	})
}));

import { hyperliquidExportOrder } from '../exportOrder';

describe('hyperliquidExportOrder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(fs.existsSync as jest.Mock).mockReturnValue(true);
		(fs.appendFileSync as jest.Mock).mockImplementation(() => {});
	});

	const filledResult = {
		status: 'ok',
		response: {
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

	it('marks strategy as not first order', async () => {
		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		expect(mockDbPush).toHaveBeenCalledWith(
			'/TestStrategy/isFirstOrder',
			'false'
		);
	});

	it('stores position data for buy orders', async () => {
		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		// position = storedSize (0.5) + orderSize (0.01) = 0.51
		expect(mockDbPush).toHaveBeenCalledWith(
			'/TestStrategy/position',
			0.51
		);
	});

	it('stores negative position data for sell orders', async () => {
		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'sell'
		);

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

		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		expect(fs.mkdirSync).toHaveBeenCalledWith(
			expect.stringContaining('data/exports/'),
			{ recursive: true }
		);
	});

	it('creates CSV with headers if file does not exist', async () => {
		(fs.existsSync as jest.Mock)
			.mockReturnValueOnce(true) // folder exists
			.mockReturnValueOnce(false); // file doesn't exist

		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		expect(fs.writeFileSync).toHaveBeenCalledWith(
			expect.stringContaining('tradeHistoryHyperliquid.csv'),
			'datetime,strategy,market,side,size,avgPrice,tradingviewPrice,priceGap,status,orderId'
		);
	});

	it('appends trade data to CSV', async () => {
		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		expect(fs.appendFileSync).toHaveBeenCalledWith(
			expect.stringContaining('tradeHistoryHyperliquid.csv'),
			expect.stringContaining('TestStrategy,BTC,BUY,0.01,50100.0,50000')
		);
	});

	it('records FILLED status for filled orders', async () => {
		await hyperliquidExportOrder(
			'TestStrategy',
			filledResult,
			50000,
			'BTC',
			'buy'
		);

		expect(fs.appendFileSync).toHaveBeenCalledWith(
			expect.any(String),
			expect.stringContaining('FILLED')
		);
	});

	it('records FAILED status when no fill data', async () => {
		const failedResult = {
			status: 'ok',
			response: { data: { statuses: [{ error: 'no liquidity' }] } }
		};

		await hyperliquidExportOrder(
			'TestStrategy',
			failedResult,
			50000,
			'BTC',
			'buy'
		);

		expect(fs.appendFileSync).toHaveBeenCalledWith(
			expect.any(String),
			expect.stringContaining('FAILED')
		);
	});
});
