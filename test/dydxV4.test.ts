import { DydxV4Client } from '../src/services/dydx_v4/dydxV4Client';

jest.setTimeout(40000);

describe('dydx v4', () => {
	it('should get orders', async () => {
		const dydxV4 = new DydxV4Client();
		const order = await dydxV4.getOrders();
		console.log(order);
	});
});
