import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { OrderParams } from '../types';

export const createOrder = async (orderParams: OrderParams) => {
	try {
		const connector = await DYDXConnector.build();

		// TODO: retry again if failed
		const orderResult: { order: OrderResponseObject } =
			await connector.client.private.createOrder(
				orderParams,
				connector.positionID
			);

		// console.log(orderResult.order);

		console.log(
			'placed order market:',
			orderParams.market,
			'side:',
			orderParams.side,
			'price:',
			orderParams.price,
			'size:',
			orderParams.size
		);

		return orderResult;
	} catch (error) {
		console.log(error);
	}
};
