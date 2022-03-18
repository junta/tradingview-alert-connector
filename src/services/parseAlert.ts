import DYDXConnector from './client';
import {
	OrderSide,
	Market,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import config = require('config');
import { AlertObject, OrderParams } from '../types';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import 'dotenv/config';

export const parseAlert = async (alertMessage: AlertObject) => {
	if (!Object.keys(alertMessage).length) {
		console.error('tradingview alert is not JSON format.');
		return;
	}

	if (
		alertMessage.passphrase &&
		alertMessage.passphrase != process.env.TRADINGVIEW_PASSPHRASE
	) {
		console.error('passphrase from tradingview alert does not match to config');
		return;
	}

	// set expiration datetime. must be more than 1 minute from current datetime
	const date = new Date();
	date.setMinutes(date.getMinutes() + 2);
	const dateStr = date.toJSON();

	const orderParams: OrderParams = {
		market: Market.BTC_USD,
		side: OrderSide.BUY,
		type: OrderType.MARKET,
		timeInForce: TimeInForce.FOK,
		postOnly: false,
		size: '',
		price: '',
		limitFee: config.get('User.limitFee'),
		expiration: dateStr
	};

	orderParams.market = Market[alertMessage.market as keyof typeof Market];
	if (!orderParams.market) {
		console.error('Market field of tradingview alert is not correct.');
		return;
	}

	const connector = await DYDXConnector.build();

	const markets = await connector.client.public.getMarkets(orderParams.market);
	// console.log('markets', markets);

	const minOrderSize = parseFloat(
		markets.markets[orderParams.market].minOrderSize
	);

	let orderSize: number;
	// check size is correct number
	if (alertMessage.size >= minOrderSize) {
		orderSize = alertMessage.size;
	} else {
		console.error(
			'Order size of this strategy should be greater than mininum order size:',
			minOrderSize
		);
		return;
	}

	if (alertMessage.order == 'buy') {
		orderParams.side = OrderSide.BUY;
	} else if (alertMessage.order == 'sell') {
		orderParams.side = OrderSide.SELL;
	} else {
		console.error(
			'Side field of tradingview alert is not correct. Should be buy or sell'
		);
		return;
	}

	const dbName =
		'./strategies/' + config.util.getEnv('NODE_ENV') + '/myStrategies';
	const db = new JsonDB(new Config(dbName, true, true, '/'));

	const rootData = db.getData('/');
	console.log('strategyData', rootData[alertMessage.strategy]);

	const rootPath = '/' + alertMessage.strategy;

	if (!rootData[alertMessage.strategy]) {
		const reversePath = rootPath + '/reverse';
		db.push(reversePath, alertMessage.reverse);
		if (alertMessage.reverse) {
			const isFirstOrderPath = rootPath + '/isFirstOrder';
			db.push(isFirstOrderPath, 'true');
		}
	}

	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderParams.size = String(orderSize * 2);
	} else {
		orderParams.size = String(orderSize);
	}

	const latestPrice = parseFloat(
		markets.markets[orderParams.market].oraclePrice
	);

	const tickSize = parseFloat(markets.markets[orderParams.market].tickSize);

	console.log('latestPrice', latestPrice);

	const slippagePercentage = 0.05;
	const minPrice =
		orderParams.side == OrderSide.BUY
			? latestPrice * (1 + slippagePercentage)
			: latestPrice * (1 - slippagePercentage);

	const decimal = getDecimalPointLength(tickSize);
	orderParams.price = minPrice.toFixed(decimal);

	console.log('orderParams', orderParams);
	return orderParams;
};

const getDecimalPointLength = function (number: number) {
	const numbers = String(number).split('.');

	return numbers[1] ? numbers[1].length : 0;
};
