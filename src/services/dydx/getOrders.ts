import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getOrders = async (): Promise<OrderResponseObject[]> => {
	const createdBeforeOrAt = new Date(
		Date.now() - 24 * 60 * 60 * 1000
	).toISOString();

	const connector = await DYDXConnector.build();
	const orderResponse = await connector.client.private.getOrders();
	const result = orderResponse.orders.filter((res) => {
		if (new Date(res.createdAt) >= new Date(createdBeforeOrAt)) {
			return res;
		}
	});
	
	return result;
};
