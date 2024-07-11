import DYDXConnector from './client';
import { OrderResponseObject } from '@dydxprotocol/v3-client';
import { dydxOrderParams } from '../../types';

export const dydxCreateOrder = async (orderParams: dydxOrderParams) => {
	// let count = 0;
	// const maxTries = 3;
	// while (count <= maxTries) {
	// 	try {
	const connector = await DYDXConnector.build();
	let orderResult: { order: OrderResponseObject };

	try {
		orderResult = await connector.client.private.createOrder(
			orderParams,
			connector.positionID
		);
	} catch (error) {
		if (
			error.message &&
			error.message.includes('order would put account below collateralization')
		) {
			console.log('order would put account below collateralization');
			return {
				error: 'order would put account below collateralization',
				order: null
			};
		}
		console.log(error.message);
		return;
	}

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
	// 	} catch (error) {
	// 		count++;
	// 		if (count == maxTries) {
	// 			console.error(error);
	// 		}
	// 		await _sleep(5000);
	// 	}
	// }
};
