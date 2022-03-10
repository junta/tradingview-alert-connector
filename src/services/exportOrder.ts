import { OrderResponseObject } from '@dydxprotocol/v3-client';
import * as fs from 'fs';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { getFill, getOrder } from '../services';

const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const exportOrder = async (
	strategy: string,
	order: OrderResponseObject,
	tradingviewPrice: number
) => {
	const db = new JsonDB(new Config('myStrategies', true, true, '/'));
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	_sleep(2000);
	const result = await getOrder(order.id);
	// console.log('result', result);

	// TODO: export price data if it is not filled
	const fill = await getFill(order.id);

	const csvPath = './exports/tradeHistory.csv';
	const appendArray = [
		result.order.createdAt,
		strategy,
		result.order.market,
		result.order.side,
		result.order.size,
		fill.price,
		tradingviewPrice,
		result.order.status,
		result.order.id,
		result.order.accountId
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(csvPath, appendString);
};
