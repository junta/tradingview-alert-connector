import DYDXConnector from './client';
import {
	OrderSide,
	Market,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import config = require('config');
import { AlertObject, dydxOrderParams } from '../../types';
import 'dotenv/config';
import { getDecimalPointLength, getStrategiesDB } from '../../helper';

export const dydxBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	// set expiration datetime. must be more than 1 minute from current datetime
	const date = new Date();
	date.setMinutes(date.getMinutes() + 2);
	const dateStr = date.toJSON();

	const connector = await DYDXConnector.build();

	const market = Market[alertMessage.market as keyof typeof Market];
	const marketsData = await connector.client.public.getMarkets(market);
	// console.log('markets', markets);

	const orderSide =
		alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

	const latestPrice = parseFloat(marketsData.markets[market].oraclePrice);
	console.log('latestPrice', latestPrice);

	let orderSize: number;
	if (alertMessage.sizeByLeverage) {
		const account = await connector.client.private.getAccount(
			process.env.ETH_ADDRESS
		);
		const equity = Number(account.account.equity)
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

	const stepSize = parseFloat(marketsData.markets[market].stepSize);
	const stepDecimal = getDecimalPointLength(stepSize);
	const orderSizeStr = Number(orderSize).toFixed(stepDecimal);

	const tickSize = parseFloat(marketsData.markets[market].tickSize);
	

	const slippagePercentage = 0.05;
	const minPrice =
		orderSide == OrderSide.BUY
			? latestPrice * (1 + slippagePercentage)
			: latestPrice * (1 - slippagePercentage);

	const decimal = getDecimalPointLength(tickSize);
	const price = minPrice.toFixed(decimal);

	const orderParams: dydxOrderParams = {
		market: market,
		side: orderSide,
		type: OrderType.MARKET,
		timeInForce: TimeInForce.FOK,
		postOnly: false,
		size: orderSizeStr,
		price: price,
		limitFee: config.get('Dydx.User.limitFee'),
		expiration: dateStr
	};
	console.log('orderParams for dydx', orderParams);
	return orderParams;
};
