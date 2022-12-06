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

	// check exports directories exist
	const path = './data/exports/';
	if (!fs.existsSync(path)) {
		// create directories
		fs.mkdirSync(path + 'mainnet', {
			recursive: true
		});

		// create new CSV
		const headerString =
			'datetime,strategy,market,side,size,orderPrice,tradingviewPrice,priceGap,transaction_hash';
		fs.writeFileSync(path + 'mainnet/tradeHistoryPerpetual.csv', headerString);
	}

	const csvPath = './data/exports/mainnet/tradeHistoryPerpetual.csv';
	// export price gap between tradingview price and ordered price
	// TODO: this number is not correct and need fix
	const orderPrice = bigNumber2BigAndScaleDown(
		orderResult.metadata.args[0].oppositeAmountBound
	).toNumber();
	const priceGap = orderPrice - tradingviewPrice;

	const date = new Date();

	const appendArray = [
		date.toISOString(),
		strategy,
		market,
		orderSide,
		orderSize,
		orderPrice,
		tradingviewPrice,
		priceGap,
		orderResult.transaction.hash
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(csvPath, appendString);
};
