import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { dydxOrderParams } from '../../types';
import { _sleep } from '../../helper';

export const dydxCreateOrder = async (orderParams: dydxOrderParams) => {
	let count = 0;
	const maxTries = 3;
	while (count <= maxTries) {
		try {
			const connector = await DYDXConnector.build();

			const orderResult: { order: OrderResponseObject } =
				await connector.client.private.createOrder(
					orderParams,
					connector.positionID
				);

			// console.log(orderResult.order);

			console.log(
				new Date() + ' placed order market:',
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
			count++;
			if (count == maxTries) {
				console.error(error);
			}
			await _sleep(5000);
		}
	}
};
