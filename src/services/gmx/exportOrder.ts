import * as fs from 'fs';
import { getStrategiesDB } from '../../helper';
import { gmxOrderResult } from '../../types';

export const gmxExportOrder = async (
	strategy: string,
	orderResult: gmxOrderResult,
	tradingviewPrice: number,
	market: string
) => {
	const [db, rootData] = getStrategiesDB();
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	const orderSize = Number(orderResult.sizeUsd);

	const orderSide = orderResult.isLong ? 'BUY' : 'SELL';

	// Store position data
	const positionPath = rootPath + '/position';
	const position = orderSide == 'BUY' ? orderSize : -1 * orderSize;

	const storedSize = rootData[strategy].position
		? rootData[strategy].position
		: 0;

	db.push(positionPath, storedSize + position);

	const folderPath = './data/exports/mainnet';
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, {
			recursive: true
		});
	}

	const gmxPath = '/tradeHistoryGMX.csv';
	const fullPath = folderPath + gmxPath;
	if (!fs.existsSync(fullPath)) {
		const headerString =
			'datetime,strategy,market,sideUsd,size,tradingviewPrice,transaction_hash';
		fs.writeFileSync(fullPath, headerString);
	}

	const date = new Date();

	const appendArray = [
		date.toISOString(),
		strategy,
		market,
		orderSide,
		orderSize,
		// orderPrice,
		tradingviewPrice,
		// priceGap,
		orderResult.txHash
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(fullPath, appendString);
};
