import {
	OrderExecution,
	OrderSide,
	OrderTimeInForce,
	OrderType
} from '@dydxprotocol/v4-client-js';
import { dydxV4OrderParams } from '../../types';
import { dydxV4Client } from './client';
import { _sleep } from '../../helper';

export const dydxV4CreateOrder = async (orderParams: dydxV4OrderParams) => {
	const { client, subaccount } = await dydxV4Client();

	const clientId = generateRandomInt32();
	const market = orderParams.market;
	const type = OrderType.MARKET;
	const side = orderParams.side;
	const timeInForce = OrderTimeInForce.GTT;
	const execution = OrderExecution.DEFAULT;
	const slippagePercentage = 0.05;
	const price =
		side == OrderSide.BUY
			? orderParams.price * (1 + slippagePercentage)
			: orderParams.price * (1 - slippagePercentage);
	const size = orderParams.size;
	const postOnly = false;
	const reduceOnly = false;
	const triggerPrice = null;
	let count = 0;
	const maxTries = 5;
	while (count <= maxTries) {
		try {
			const tx = await client.placeOrder(
				subaccount,
				market,
				type,
				side,
				price,
				size,
				clientId,
				timeInForce,
				60000, // 1 minute
				execution,
				postOnly,
				reduceOnly,
				triggerPrice
			);
			console.log('Transaction Result: ', tx);
			return {
				side: orderParams.side,
				size: orderParams.size,
				price: orderParams.price,
				market: orderParams.market,
				clientId: clientId
			};
		} catch (error) {
			console.error(error);
			count++;

			await _sleep(5000);
		}
	}
};

function generateRandomInt32(): number {
	const maxInt32 = 2147483647;
	return Math.floor(Math.random() * (maxInt32 + 1));
}
