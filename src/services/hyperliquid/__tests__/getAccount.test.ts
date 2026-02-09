const mockGetAccountState = jest.fn();

jest.mock('../client', () => ({
	__esModule: true,
	default: {
		build: jest.fn(() => ({
			getAccountState: mockGetAccountState
		}))
	}
}));

import { hyperliquidGetAccount } from '../getAccount';
import HyperliquidConnector from '../client';

describe('hyperliquidGetAccount', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns true when account has positive value', async () => {
		mockGetAccountState.mockResolvedValue({
			marginSummary: { accountValue: '1500.50' }
		});

		const result = await hyperliquidGetAccount();
		expect(result).toBe(true);
	});

	it('returns false when account value is zero', async () => {
		mockGetAccountState.mockResolvedValue({
			marginSummary: { accountValue: '0' }
		});

		const result = await hyperliquidGetAccount();
		expect(result).toBe(false);
	});

	it('returns false when connector build fails', async () => {
		(HyperliquidConnector.build as jest.Mock).mockReturnValueOnce(null);

		const result = await hyperliquidGetAccount();
		expect(result).toBe(false);
	});

	it('returns false on API error', async () => {
		mockGetAccountState.mockRejectedValue(new Error('API error'));

		const result = await hyperliquidGetAccount();
		expect(result).toBe(false);
	});
});
