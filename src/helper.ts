import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import config = require('config');
import Big from 'big.js';
import { BigNumber } from 'ethers';
import { AlertObject } from './types';

export const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const getDecimalPointLength = function (number: number) {
	const numbers = String(number).split('.');

	return numbers[1] ? numbers[1].length : 0;
};

export const getStrategiesDB = () => {
	const environment =
		config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
	const dbName = './data/strategies/' + environment + '/myStrategies';
	const db = new JsonDB(new Config(dbName, true, true, '/'));
	const rootData = db.getData('/');
	return [db, rootData];
};

export const doubleSizeIfReverseOrder = (
	alertMessage: AlertObject,
	orderSize: number
): number => {
	const [, rootData] = getStrategiesDB();
	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		return orderSize * 2;
	}
	return orderSize;
};

function bigNumber2Big(value: BigNumber): Big {
	return new Big(value.toString());
}

export function bigNumber2BigAndScaleDown(
	value: BigNumber,
	decimals = 18
): Big {
	return scaleDownDecimals(bigNumber2Big(value), decimals);
}

function scaleDownDecimals(number: Big, decimals: number) {
	return number.div(new Big(10).pow(decimals));
}

export function calculateProfit(price: number, entryPrice: number): number {
	return (price / entryPrice) * 100 - 100;
}
