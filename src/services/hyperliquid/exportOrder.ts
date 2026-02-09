import * as fs from 'fs';
import { getStrategiesDB } from '../../helper';
import config = require('config');

export const hyperliquidExportOrder = async (
	strategy: string,
	orderResult: any,
	tradingviewPrice: number,
	market: string,
	orderSide: string
) => {
	const [db, rootData] = getStrategiesDB();
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	// Extract fill data from Hyperliquid response
	const statuses = orderResult.response?.data?.statuses || [];
	const fillData = statuses[0]?.filled || {};

	const totalSz = fillData.totalSz || '0';
	const avgPx = fillData.avgPx || '0';
	const oid = fillData.oid || '';
	const orderSize = parseFloat(totalSz);

	const side = orderSide == 'buy' ? 'BUY' : 'SELL';

	// Store position data
	const positionPath = rootPath + '/position';
	const position = side == 'BUY' ? orderSize : -1 * orderSize;
	const storedSize = rootData[strategy]?.position
		? rootData[strategy].position
		: 0;

	db.push(positionPath, storedSize + position);

	const environment =
		config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
	const folderPath = './data/exports/' + environment;
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, { recursive: true });
	}

	const fullPath = folderPath + '/tradeHistoryHyperliquid.csv';
	if (!fs.existsSync(fullPath)) {
		const headerString =
			'datetime,strategy,market,side,size,avgPrice,tradingviewPrice,priceGap,status,orderId';
		fs.writeFileSync(fullPath, headerString);
	}

	const priceGap = parseFloat(avgPx) - tradingviewPrice;
	const status = statuses[0]?.filled ? 'FILLED' : 'FAILED';
	const date = new Date();

	const appendArray = [
		date.toISOString(),
		strategy,
		market,
		side,
		orderSize,
		avgPx,
		tradingviewPrice,
		priceGap,
		status,
		oid
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(fullPath, appendString);
};
