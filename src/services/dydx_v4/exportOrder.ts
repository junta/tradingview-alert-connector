import * as fs from 'fs';
import config = require('config');
import { getStrategiesDB } from '../../helper';

export const dydxV4ExportOrder = async (
	strategy: string,
	orderResult: any,
	tradingviewPrice: number,
	market: string
) => {
	const [db, rootData] = getStrategiesDB();
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	const orderSize = Number(orderResult.size);

	// Store position data
	const positionPath = rootPath + '/position';
	const position = orderResult.side == 'BUY' ? orderSize : -1 * orderSize;

	const storedSize = rootData[strategy].position
		? rootData[strategy].position
		: 0;

	db.push(positionPath, storedSize + position);

	const environment =
		config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
	const folderPath = './data/exports/' + environment;
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, {
			recursive: true
		});
	}

	const fullPath = folderPath + '/tradeHistoryDydxV4.csv';
	if (!fs.existsSync(fullPath)) {
		const headerString =
			'datetime,strategy,market,sideUsd,size,tradingviewPrice,client_id';
		fs.writeFileSync(fullPath, headerString);
	}
	const date = new Date();

	const appendArray = [
		date.toISOString(),
		strategy,
		market,
		orderResult.side,
		orderResult.size,
		tradingviewPrice,
		orderResult.clientId
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(fullPath, appendString);
};
