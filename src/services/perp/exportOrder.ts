import * as fs from 'fs';
import { getStrategiesDB, bigNumber2BigAndScaleDown } from '../../helper';

export const perpExportOrder = async (
	strategy: string,
	orderResult: any,
	tradingviewPrice: number,
	market: string
) => {
	const [db, rootData] = getStrategiesDB();
	const rootPath = '/' + strategy;
	const isFirstOrderPath = rootPath + '/isFirstOrder';
	db.push(isFirstOrderPath, 'false');

	const orderSize = bigNumber2BigAndScaleDown(
		orderResult.metadata.args[0].amount
	).toNumber();

	const orderSide =
		orderResult.metadata.args[0].isBaseToQuote == true ? 'SELL' : 'BUY';

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

	const perpPath = '/tradeHistoryPerpetual.csv'
	const fullPath = folderPath + perpPath;
	if (!fs.existsSync(fullPath)) {
		const headerString = 'datetime,strategy,market,side,size,tradingviewPrice,transaction_hash';
		fs.writeFileSync(fullPath, headerString);
	}

	// export price gap between tradingview price and ordered price
	// TODO: Get correct ordered price and store them
	// const priceGap = orderPrice - tradingviewPrice;

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
		orderResult.transaction.hash
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(fullPath, appendString);
};
