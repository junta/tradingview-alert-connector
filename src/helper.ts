import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import config = require('config');
import Big from 'big.js';
import { BigNumber } from 'ethers';
import CryptoJS from 'crypto-js';

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

export function auth(req, res, next) {
	try {

		const bytes = CryptoJS.AES.decrypt(req.header('AUTH_KEY'), process.env.AES_KEY);
		const message = bytes.toString(CryptoJS.enc.Utf8);
		if (message === process.env.AUTH_MESSAGE) {
			next();
		} else {
			res.sendStatus(403);
		}
	} catch {
		res.sendStatus(403);
	}
}
