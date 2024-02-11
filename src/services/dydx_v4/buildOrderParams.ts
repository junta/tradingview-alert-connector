import config = require('config');
import { AlertObject, dydxV4OrderParams } from '../../types';
import 'dotenv/config';
import { getDecimalPointLength, getStrategiesDB } from '../../helper';
import { OrderSide } from '@dydxprotocol/v4-client-js';

export const dydxV4BuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const orderSide =
		alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

	// const latestPrice = parseFloat(marketsData.markets[market].oraclePrice);
	const latestPrice = alertMessage.price;
	console.log('latestPrice', latestPrice);

	let orderSize: number;
	if (alertMessage.sizeByLeverage) {
		// const equity = Number(account.account.equity);
		const equity = 1000;
		orderSize = (equity * Number(alertMessage.sizeByLeverage)) / latestPrice;
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

	// const stepSize = parseFloat(marketsData.markets[market].stepSize);
	// const stepDecimal = getDecimalPointLength(stepSize);
	// const orderSizeStr = Number(orderSize).toFixed(stepDecimal);

	// const tickSize = parseFloat(marketsData.markets[market].tickSize);

	// const slippagePercentage = 0.05;
	// const minPrice =
	// 	orderSide == OrderSide.BUY
	// 		? latestPrice * (1 + slippagePercentage)
	// 		: latestPrice * (1 - slippagePercentage);

	// const decimal = getDecimalPointLength(tickSize);
	// const price = minPrice.toFixed(decimal);

	const orderParams: dydxV4OrderParams = {
		market: alertMessage.market,
		side: orderSide,
		size: Number(orderSize),
		price: Number(alertMessage.price)
	};
	console.log('orderParams for dydx', orderParams);
	return orderParams;
};
