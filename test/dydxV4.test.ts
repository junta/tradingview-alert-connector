import { getDyDxV4Orders } from '../src/services/dydx_v4/createOrder';

jest.setTimeout(40000);

describe('dydx v4', () => {
	it('should get orders', async () => {
		const order = await getDyDxV4Orders();
		console.log(order);
	});
});
