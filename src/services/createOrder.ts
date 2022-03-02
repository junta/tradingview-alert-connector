import dydxClient from './client';
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
	const orderResult: { order: OrderResponseObject } =
		await dydxClient.private.createOrder(
			{
				market: Market.BTC_USD,
				side: OrderSide.BUY,
				type: OrderType.MARKET,
				timeInForce: TimeInForce.FOK,
				postOnly: false,
				size: '0.01',
				price: '50000',
				limitFee: LIMIT_FEE,
				expiration: '2022-12-21T21:30:20.200Z'
			},
			// TODO: should be dynamic
			'167823' // required for creating the order signature
		);

	return orderResult;
};

export default createOrder;
