import { OrderResponseObject } from '@dydxprotocol/v3-client';
import * as fs from 'fs';
import { getFill, getOrder } from '..';
import config = require('config');
import { _sleep, getStrategiesDB } from '../../helper';

export const dydxExportOrder = async (
	strategy: string,
	order: OrderResponseObject,
	tradingviewPrice: number
) => {
	_sleep(2000);
	const result = await getOrder(order.id);
	if (!result) {
		return;
	}
	console.log('result', result);

	let price;
	if (result.order.status == 'FILLED') {
		const fill = await getFill(order.id);
		price = fill ? fill.price : '';

		console.log('order id:', order.id, 'is filled at', price);

		const [db, rootData] = getStrategiesDB();
		const rootPath = '/' + strategy;
		const isFirstOrderPath = rootPath + '/isFirstOrder';
		db.push(isFirstOrderPath, 'false');

		// Store position data
		const positionPath = rootPath + '/position';
		const position: number =
			order.side == 'BUY' ? Number(order.size) : -1 * Number(order.size);

		const storedSize = rootData[strategy].position
			? rootData[strategy].position
			: 0;

		db.push(positionPath, storedSize + position);
	} else {
		price = '';
	}

	const environment =
	config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
	const folderPath = './data/exports/' + environment;
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, {
			recursive: true
		});
	}

	const fullPath = folderPath + '/tradeHistoryDydx.csv';
	if (!fs.existsSync(fullPath)) {
		const headerString = 'datetime,strategy,market,side,size,orderPrice,tradingviewPrice,priceGap,status,orderId,accountId';
		fs.writeFileSync(fullPath, headerString);
	}

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

	fs.appendFileSync(fullPath, appendString);
};
