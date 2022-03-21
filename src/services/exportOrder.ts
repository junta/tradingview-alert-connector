import { OrderResponseObject } from '@dydxprotocol/v3-client';
import * as fs from 'fs';
import { getFill, getOrder } from '../services';
import config = require('config');
import { _sleep, getStrategiesDB } from '../helper';

export const exportOrder = async (
	strategy: string,
	order: OrderResponseObject,
	tradingviewPrice: number
) => {
	_sleep(2000);
	const result = await getOrder(order.id);
	// console.log('result', result);

	let price;
	if (result.order.status == 'FILLED') {
		const fill = await getFill(order.id);
		price = fill.price;

		console.log('order id:', order.id, 'is filled at', price);

		const db = getStrategiesDB();
		const rootPath = '/' + strategy;
		const isFirstOrderPath = rootPath + '/isFirstOrder';
		db.push(isFirstOrderPath, 'false');
	} else {
		price = '';
	}

	const currentEnv = config.util.getEnv('NODE_ENV');
	const csvPath = './exports/' + currentEnv + '/tradeHistory.csv';
	// export price gap between tradingview price and ordered price
	const priceGap = Number(price) - tradingviewPrice;
	const appendArray = [
		result.order.createdAt,
		strategy,
		result.order.market,
		result.order.side,
		result.order.size,
		price,
		tradingviewPrice,
		priceGap,
		result.order.status,
		result.order.id,
		result.order.accountId
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(csvPath, appendString);
};
