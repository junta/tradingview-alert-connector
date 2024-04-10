import {
	OrderExecution,
	OrderSide,
	OrderTimeInForce,
	OrderType
} from '@dydxprotocol/v4-client-js';
import { dydxV4OrderParams } from '../../types';
import {
	dydxV4Client,
	dydxV4IndexerClient,
	generateLocalWallet
} from './client';
import { _sleep } from '../../helper';
import 'dotenv/config';

export const dydxV4CreateOrder = async (orderParams: dydxV4OrderParams) => {
	const { client, subaccount } = await dydxV4Client();

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
	const maxTries = 3;
	const fillWaitTime = 60000; // 1 minute
	while (count <= maxTries) {
		try {
			const clientId = generateRandomInt32();
			console.log('Client ID: ', clientId);

			const tx = await client.placeOrder(
				subaccount,
				market,
				type,
				side,
				price,
				size,
				clientId,
				timeInForce,
				120000, // 2 minute
				execution,
				postOnly,
				reduceOnly,
				triggerPrice
			);
			console.log('Transaction Result: ', tx);
			await _sleep(fillWaitTime);

			const isFilled = await isDyDxV4OrderFilled(String(clientId));
			if (!isFilled)
				throw new Error(
					'Order is not found/filled. Retry again, count: ' + count
				);

			return {
				side: orderParams.side,
				size: orderParams.size,
				price: orderParams.price,
				market: orderParams.market,
				clientId: clientId
			};
		} catch (error) {
			console.error(error);
			console.log('Retry again, count: ' + count);
			count++;

			await _sleep(5000);
		}
	}
};

function generateRandomInt32(): number {
	const maxInt32 = 2147483647;
	return Math.floor(Math.random() * (maxInt32 + 1));
}

export const getDyDxV4Orders = async () => {
	const client = dydxV4IndexerClient();
	const localWallet = await generateLocalWallet();
	if (!localWallet) return;

	return await client.account.getSubaccountOrders(localWallet.address, 0);
};

export const isDyDxV4OrderFilled = async (
	clientId: string
): Promise<boolean> => {
	const orders = await getDyDxV4Orders();

	const order = orders.find((order) => {
		return order.clientId == clientId;
	});
	if (!order) return false;

	console.log('dYdX v4 Order ID: ', order.id);

	return order.status == 'FILLED';
};
