import DYDXConnector from './client';
import {
	OrderResponseObject,
	OrderSide,
	OrderType,
	TimeInForce,
	Market
} from '@dydxprotocol/v3-client';
import config = require('config');
import { alertObject } from '../types';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { getFill, getOrder, exportOrder } from '../services';

const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const createOrder = async (alertMessage: alertObject) => {
	let orderSize: number;
	// check size is correct number
	if (Number(alertMessage.size) > 0) {
		orderSize = Number(alertMessage.size);
	} else {
		console.error('size of this strategy is not correct');
		return;
	}

	const orderSide =
		alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

	// set expiration datetime. must be more than 1 minute from current datetime
	const date = new Date();
	date.setMinutes(date.getMinutes() + 2);
	const dateStr = date.toJSON();

	const orderMarket = Market[alertMessage.ticker as keyof typeof Market];
	console.log('orderMarket: ', orderMarket);

	const db = new JsonDB(new Config('myStrategies', true, true, '/'));

	const rootData = db.getData('/');
	console.log('strategyData', rootData[alertMessage.strategy]);
	let isReverseFirstOrder = false;
	const rootPath = '/' + alertMessage.strategy;

	if (!rootData[alertMessage.strategy]) {
		const reversePath = rootPath + '/reverse';
		db.push(reversePath, alertMessage.reverse);
		if (alertMessage.reverse) {
			const isFirstOrderPath = rootPath + '/isFirstOrder';
			db.push(isFirstOrderPath, 'true');
			isReverseFirstOrder = true;
		}
	}

	const rootDataAfter = db.getData('/');

	if (
		alertMessage.reverse === true &&
		rootDataAfter[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = orderSize * 2;
	}

	const rootDataBefore = db.getData('/');
	console.log('rootDataBefore', rootDataBefore);

	try {
		const connector = await DYDXConnector.build();

		// set slippage price
		const markets = await connector.client.public.getMarkets(orderMarket);
		console.log('markets', markets);
		const latestPrice = parseFloat(markets.markets[orderMarket].oraclePrice);
		const minPrice =
			orderSide == OrderSide.BUY
				? latestPrice * (1 + 0.01)
				: latestPrice * (1 - 0.01);

		// TODO: retry again if failed
		const orderResult: { order: OrderResponseObject } =
			await connector.client.private.createOrder(
				{
					market: orderMarket,
					side: orderSide,
					type: OrderType.MARKET,
					timeInForce: TimeInForce.FOK,
					postOnly: false,
					size: String(orderSize),
					price: String(Math.ceil(minPrice)),
					limitFee: config.get('User.limitFee'),
					expiration: dateStr
				},
				connector.positionID
			);

		// console.log(orderResult.order);

		console.log(
			'placed order market:',
			orderMarket,
			'side:',
			orderSide,
			'price:',
			alertMessage.price,
			'size:',
			orderSize
		);

		if (isReverseFirstOrder) {
			const isFirstOrderPath = rootPath + '/isFirstOrder';
			db.push(isFirstOrderPath, 'false');
		}

		// const rootDataAfter = db.getData('/');
		// console.log('rootDataAfter', rootDataAfter);

		// TODO: retry again if failed
		_sleep(2000);
		const result = await getOrder(orderResult.order.id);
		// console.log('result', result);

		// TODO: export price data if it is not filled
		const fill = await getFill(orderResult.order.id);

		await exportOrder(
			alertMessage.strategy,
			result.order,
			Number(fill.price),
			alertMessage.price
		);

		return orderResult;
	} catch (error) {
		console.log(error);
	}
};
