import DYDXConnector from './client';
import {
	OrderSide,
	Market,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import config = require('config');
import { AlertObject, OrderParams } from '../types';
import 'dotenv/config';
import { getDecimalPointLength, getStrategiesDB } from '../helper';

export const buildOrderParams = async (alertMessage: AlertObject) => {
	const db = getStrategiesDB();

	const rootData = db.getData('/');
	console.log('strategyData', rootData[alertMessage.strategy]);

	const rootPath = '/' + alertMessage.strategy;

	if (!rootData[alertMessage.strategy]) {
		const reversePath = rootPath + '/reverse';
		db.push(reversePath, alertMessage.reverse);

		const isFirstOrderPath = rootPath + '/isFirstOrder';
		db.push(isFirstOrderPath, 'true');
	}

	if (
		alertMessage.position == 'flat' &&
		rootData[alertMessage.strategy].isFirstOrder == 'true'
	) {
		console.log(
			'this alert is first and close order, so does not create a new order.'
		);
		return;
	}

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

	let orderSize: number;
	if (
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

	const latestPrice = parseFloat(marketsData.markets[market].oraclePrice);
	const tickSize = parseFloat(marketsData.markets[market].tickSize);
	console.log('latestPrice', latestPrice);

	const slippagePercentage = 0.05;
	const minPrice =
		orderSide == OrderSide.BUY
			? latestPrice * (1 + slippagePercentage)
			: latestPrice * (1 - slippagePercentage);

	const decimal = getDecimalPointLength(tickSize);
	const price = minPrice.toFixed(decimal);

	const orderParams: OrderParams = {
		market: market,
		side: orderSide,
		type: OrderType.MARKET,
		timeInForce: TimeInForce.FOK,
		postOnly: false,
		size: orderSizeStr,
		price: price,
		limitFee: config.get('User.limitFee'),
		expiration: dateStr
	};
	console.log('orderParams', orderParams);
	return orderParams;
};
