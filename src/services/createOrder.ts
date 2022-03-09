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

const createOrder = async (alertMessage: alertObject) => {
	let orderSize: string;
	// check size is correct number
	if (Number(alertMessage.size) > 0) {
		orderSize = alertMessage.size;
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

		const orderResult: { order: OrderResponseObject } =
			await connector.client.private.createOrder(
				{
					market: orderMarket,
					side: orderSide,
					type: OrderType.MARKET,
					timeInForce: TimeInForce.FOK,
					postOnly: false,
					size: orderSize,
					price: String(Math.ceil(minPrice)),
					limitFee: config.get('User.limitFee'),
					expiration: dateStr
				},
				connector.positionID
			);

		console.log(
			'placed order market:',
			orderMarket,
			'side:',
			orderSide,
			'price:',
			alertMessage.price
		);
		return orderResult;
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export default createOrder;
