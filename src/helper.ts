import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import config = require('config');

export const _sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const getDecimalPointLength = function (number: number) {
	const numbers = String(number).split('.');

	return numbers[1] ? numbers[1].length : 0;
};

export const getStrategiesDB = () => {
	const dbName =
		'./strategies/' + config.util.getEnv('NODE_ENV') + '/myStrategies';
	const db = new JsonDB(new Config(dbName, true, true, '/'));
	return db;
};
