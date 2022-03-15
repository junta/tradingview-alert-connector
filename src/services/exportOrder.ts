import { OrderResponseObject } from '@dydxprotocol/v3-client';
import * as fs from 'fs';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { getFill, getOrder } from '../services';
import config = require('config');

const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const exportOrder = async (
	strategy: string,
	order: OrderResponseObject,
	tradingviewPrice: number
) => {
	const dbName = config.util.getEnv('NODE_ENV') + 'MyStrategies';
	const db = new JsonDB(new Config(dbName, true, true, '/'));
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	_sleep(2000);
	const result = await getOrder(order.id);
	// console.log('result', result);

	// TODO: export price data if it is not filled
	const fill = await getFill(order.id);

	const currentEnv = config.util.getEnv('NODE_ENV');
	const csvPath = './exports/' + currentEnv + '/tradeHistory.csv';
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
