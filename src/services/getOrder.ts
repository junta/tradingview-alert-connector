import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../helper';

export const getOrder = async (order_id: string) => {
	let count = 0;
	const maxTries = 3;
	while (count <= maxTries) {
		try {
			const connector = await DYDXConnector.build();
			const orderResponse: { order: OrderResponseObject } =
				await connector.client.private.getOrderById(order_id);

			return orderResponse;
		} catch (error) {
			count++;
			if (count == maxTries) {
				console.error(error);
			}
			_sleep(5000);
		}
	}
};
