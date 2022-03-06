import DYDXConnector from './client';
import {
	Market,
	AccountResponseObject,
	OrderResponseObject,
	OrderSide,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import { LIMIT_FEE } from '../constants';

const createOrder = async () => {
	try {
		const connector = new DYDXConnector();

		const orderResult: { order: OrderResponseObject } =
			await connector.client.private.createOrder(
				{
					market: Market.BTC_USD,
					side: OrderSide.BUY,
					type: OrderType.MARKET,
					timeInForce: TimeInForce.FOK,
					postOnly: false,
					size: '0.001',
					price: '50000',
					limitFee: LIMIT_FEE,
					expiration: '2022-12-21T21:30:20.200Z'
				},
				// TODO: should be dynamic
				// '167823' // required for creating the order signature
				'59250'
			);

		return orderResult;
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export default createOrder;
