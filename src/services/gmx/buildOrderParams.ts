import { AlertObject, gmxOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';
import 'dotenv/config';
import { gmxTokenMap } from './constants';

export const gmxBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const isLong = alertMessage.order == 'buy' ? true : false;

	let orderSize: number;
	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = alertMessage.sizeUsd * 2;
	} else {
		orderSize = alertMessage.sizeUsd;
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
