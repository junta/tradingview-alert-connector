import { dydxV4CreateOrder } from '../src/services/dydx_v4/createOrder';

jest.setTimeout(40000);

describe('dydx v4', () => {
	it('createOrder', async () => {
		await dydxV4CreateOrder();
	});
});
