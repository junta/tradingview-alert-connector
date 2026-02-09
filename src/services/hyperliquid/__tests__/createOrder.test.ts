jest.mock('../../../helper', () => ({
	_sleep: jest.fn(() => Promise.resolve())
}));

jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configMap: Record<string, any> = {
			'Hyperliquid.User.builderFee': 10
		};
		return configMap[key];
	})
}));

const mockPlaceOrder = jest.fn();
const mockSetReferrer = jest.fn();

jest.mock('../client', () => ({
	__esModule: true,
	default: {
		build: jest.fn(() => ({
			placeOrder: mockPlaceOrder,
			setReferrer: mockSetReferrer
		}))
	}
}));

// Need to reset the module-level referrerAttempted flag between tests
let hyperliquidCreateOrder: any;

describe('hyperliquidCreateOrder', () => {
	const orderParams = {
		coin: 'BTC',
		isBuy: true,
		size: '0.01000',
		price: '52500',
		reduceOnly: false,
		assetIndex: 0
	};

	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		// Re-import module to reset referrerAttempted flag
		jest.resetModules();
		jest.mock('../../../helper', () => ({
			_sleep: jest.fn(() => Promise.resolve())
		}));
		jest.mock('config', () => ({
			get: jest.fn((key: string) => {
				const configMap: Record<string, any> = {
					'Hyperliquid.User.builderFee': 10
				};
				return configMap[key];
			})
		}));
		jest.mock('../client', () => ({
			__esModule: true,
			default: {
				build: jest.fn(() => ({
					placeOrder: mockPlaceOrder,
					setReferrer: mockSetReferrer
				}))
			}
		}));
		hyperliquidCreateOrder =
			require('../createOrder').hyperliquidCreateOrder;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('places order successfully and returns result', async () => {
		const mockResult = {
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
		mockPlaceOrder.mockResolvedValue(mockResult);

		const result = await hyperliquidCreateOrder(orderParams);

		expect(result).toEqual(mockResult);
		expect(mockPlaceOrder).toHaveBeenCalledWith(
			0,
			true,
			'52500',
			'0.01000',
			false,
			undefined
		);
	});

	it('calls setReferrer on first order when HYPERLIQUID_REFERRAL_CODE is set', async () => {
		process.env.HYPERLIQUID_REFERRAL_CODE = 'MYCODE';
		mockPlaceOrder.mockResolvedValue({
			status: 'ok',
			response: { data: { statuses: [] } }
		});
		mockSetReferrer.mockResolvedValue({ status: 'ok' });

		await hyperliquidCreateOrder(orderParams);

		expect(mockSetReferrer).toHaveBeenCalledWith('MYCODE');
	});

	it('does not call setReferrer when HYPERLIQUID_REFERRAL_CODE is not set', async () => {
		delete process.env.HYPERLIQUID_REFERRAL_CODE;
		mockPlaceOrder.mockResolvedValue({
			status: 'ok',
			response: { data: { statuses: [] } }
		});

		await hyperliquidCreateOrder(orderParams);

		expect(mockSetReferrer).not.toHaveBeenCalled();
	});

	it('only attempts setReferrer once across multiple orders', async () => {
		process.env.HYPERLIQUID_REFERRAL_CODE = 'MYCODE';
		mockPlaceOrder.mockResolvedValue({
			status: 'ok',
			response: { data: { statuses: [] } }
		});
		mockSetReferrer.mockResolvedValue({ status: 'ok' });

		await hyperliquidCreateOrder(orderParams);
		await hyperliquidCreateOrder(orderParams);

		expect(mockSetReferrer).toHaveBeenCalledTimes(1);
	});

	it('includes builder fee when HYPERLIQUID_BUILDER_ADDRESS is set', async () => {
		process.env.HYPERLIQUID_BUILDER_ADDRESS =
			'0x1234567890abcdef1234567890abcdef12345678';
		mockPlaceOrder.mockResolvedValue({
			status: 'ok',
			response: { data: { statuses: [] } }
		});

		await hyperliquidCreateOrder(orderParams);

		expect(mockPlaceOrder).toHaveBeenCalledWith(
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
		mockPlaceOrder.mockResolvedValue({
			status: 'ok',
			response: { data: { statuses: [] } }
		});

		await hyperliquidCreateOrder(orderParams);

		expect(mockPlaceOrder).toHaveBeenCalledWith(
			0,
			true,
			'52500',
			'0.01000',
			false,
			undefined
		);
	});

	it('retries on failure up to maxTries', async () => {
		mockPlaceOrder
			.mockRejectedValueOnce(new Error('Network error'))
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce({
				status: 'ok',
				response: { data: { statuses: [{ filled: {} }] } }
			});

		const result = await hyperliquidCreateOrder(orderParams);
		expect(result.status).toBe('ok');
		expect(mockPlaceOrder).toHaveBeenCalledTimes(3);
	});

	it('throws on Hyperliquid error response and retries', async () => {
		mockPlaceOrder.mockResolvedValue({
			status: 'err',
			response: 'Insufficient margin'
		});

		const result = await hyperliquidCreateOrder(orderParams);

		expect(result).toBeUndefined();
		expect(mockPlaceOrder).toHaveBeenCalledTimes(4);
	});
});
