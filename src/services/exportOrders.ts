import { OrderResponseObject } from '@dydxprotocol/v3-client';
import * as fs from 'fs';

const exportOrders = async (
	strategy: string,
	order: OrderResponseObject,
	fillPrice: number,
	tradingviewPrice: number
) => {
	const csvPath = './exports/tradeHistory.csv';
	const appendArray = [
		order.createdAt,
		strategy,
		order.market,
		order.side,
		order.size,
		fillPrice,
		tradingviewPrice,
		order.status,
		order.id,
		order.accountId
	];
	const appendString = '\r\n' + appendArray.join();

	fs.appendFileSync(csvPath, appendString);
};

export default exportOrders;
