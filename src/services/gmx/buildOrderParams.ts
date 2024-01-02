import { AlertObject, gmxOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';
import 'dotenv/config';
import { tokenMap } from './tokenMap';

export const gmxBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const isLong = alertMessage.order == 'buy' ? true : false;

	let orderSize: number;
	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = alertMessage.size * 2;
	} else {
		orderSize = alertMessage.size;
	}

	tokenMap.get(alertMessage.market);

	const orderParams: gmxOrderParams = {
		marketAddress: tokenMap.get(alertMessage.market),
		// TODO:
		orderType: 2,
		isLong,
		// sizeUsd: orderSize
		sizeUsd: 3,
		price: alertMessage.price
	};
	console.log('orderParams for GMX', orderParams);
	return orderParams;
};
