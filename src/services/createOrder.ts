import DYDXConnector from './client';
import {
	Market,
	OrderResponseObject,
	OrderSide,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import config = require('config');

const createOrder = async () => {
	try {
		const connector = await DYDXConnector.build();

		// set expiration datetime. must be more than 1 minute from current datetime
		const date = new Date();
		date.setMinutes(date.getMinutes() + 2);
		const dateStr = date.toJSON();

		// set slippage price
		const markets = await connector.client.public.getMarkets(Market.BTC_USD);
		const latestPrice = parseFloat(markets.markets['BTC-USD'].oraclePrice);
		const minPrice = String(Math.ceil(latestPrice * 0.99));

		const orderResult: { order: OrderResponseObject } =
			await connector.client.private.createOrder(
				{
					market: Market.BTC_USD,
					side: OrderSide.SELL,
					type: OrderType.MARKET,
					timeInForce: TimeInForce.FOK,
					postOnly: false,
					size: '0.001',
					price: minPrice,
					limitFee: config.get('User.limitFee'),
					expiration: dateStr
				},
				connector.positionID
			);

		console.log(
			'placed order market:',
			Market.BTC_USD,
			'side:',
			OrderSide.SELL
		);
		return orderResult;
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export default createOrder;
