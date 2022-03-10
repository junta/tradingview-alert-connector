import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');

export const getOrder = async (order_id: string) => {
	try {
		const connector = await DYDXConnector.build();
		const orderResponse: { order: OrderResponseObject } =
			await connector.client.private.getOrderById(order_id);

		return orderResponse;
	} catch (error) {
		console.log(error);
		throw error;
	}
};
