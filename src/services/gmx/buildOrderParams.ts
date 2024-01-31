import { AlertObject, gmxOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';
import 'dotenv/config';
import { gmxTokenMap } from './constants';

export const gmxBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const isLong = alertMessage.order == 'buy' ? true : false;

	let orderSize: number;

	if (alertMessage.size) {
		// convert to USD size
		orderSize = Math.floor(
			Number(alertMessage.size) * Number(alertMessage.price)
		);
	} else if (alertMessage.sizeUsd) {
		orderSize = alertMessage.sizeUsd;
	} else {
		console.error('Order size is not specified in alert message');
		return;
	}

	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = orderSize * 2;
	}

	if (orderSize < 2) {
		console.error('Order size must be greater than 2 USD');
		return;
	}

	const market = gmxTokenMap.get(alertMessage.market);
	if (!market) {
		console.error(`Market: ${alertMessage.market} is not supported`);
		return;
	}

	const orderParams: gmxOrderParams = {
		marketAddress: market,
		isLong,
		sizeUsd: orderSize,
		price: alertMessage.price
	};
	console.log('orderParams for GMX', orderParams);
	return orderParams;
};
