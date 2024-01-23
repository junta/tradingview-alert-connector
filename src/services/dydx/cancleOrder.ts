import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const cancelOrder = async (order_id: string) => {
	const connector = await DYDXConnector.build();
	const orderResponse: { cancelOrder: OrderResponseObject } =
		await connector.client.private.cancelOrder(order_id);
	return orderResponse;
};
