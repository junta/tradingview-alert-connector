import { AlertObject, dydxV4OrderParams } from '../../types';
import 'dotenv/config';
import { getStrategiesDB } from '../../helper';
import { OrderSide } from '@dydxprotocol/v4-client-js';
import { dydxV4GetAccount } from './getAccount';

export const dydxV4BuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const orderSide =
		alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

	const latestPrice = alertMessage.price;
	console.log('latestPrice', latestPrice);

	let orderSize: number;
	if (alertMessage.sizeByLeverage) {
		const { isReady, account } = await dydxV4GetAccount();

		orderSize =
			(account.equity * Number(alertMessage.sizeByLeverage)) / latestPrice;
	} else if (alertMessage.sizeUsd) {
		orderSize = Number(alertMessage.sizeUsd) / latestPrice;
	} else if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = alertMessage.size * 2;
	} else {
		orderSize = alertMessage.size;
	}

	const market = alertMessage.market.replace(/_/g, '-');

	const orderParams: dydxV4OrderParams = {
		market,
		side: orderSide,
		size: Number(orderSize),
		price: Number(alertMessage.price)
	};
	console.log('orderParams for dydx', orderParams);
	return orderParams;
};
