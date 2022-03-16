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

export const parseAlert = async (alertMessage: AlertObject) => {
	if (!Object.keys(alertMessage).length) {
		console.error('tradingview alert is not JSON format.');
		return;
	}

	if (
		alertMessage.passphrase &&
		alertMessage.passphrase != config.get('User.tradingviewPassphrase')
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

	let orderSize: number;
	// check size is correct number
	if (alertMessage.size > 0) {
		orderSize = alertMessage.size;
	} else {
		console.error('Size of this strategy is not correct');
		return;
	}

	const dbName = config.util.getEnv('NODE_ENV') + 'MyStrategies';
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

	const rootDataAfter = db.getData('/');

	if (
		alertMessage.reverse === true &&
		rootDataAfter[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderParams.size = String(orderSize * 2);
	} else {
		orderParams.size = String(orderSize);
	}

	orderParams.market = Market[alertMessage.market as keyof typeof Market];
	console.log('orderMarket: ', orderParams.market);
	if (!orderParams.market) {
		console.error('Market field of tradingview alert is not correct.');
		return;
	}

	const connector = await DYDXConnector.build();

	// set slippage price
	const markets = await connector.client.public.getMarkets(orderParams.market);
	// console.log('markets', markets);
	const latestPrice = parseFloat(
		markets.markets[orderParams.market].oraclePrice
	);

	const slippagePercentage = 0.01;
	const minPrice =
		orderParams.side == OrderSide.BUY
			? latestPrice * (1 + slippagePercentage)
			: latestPrice * (1 - slippagePercentage);
	orderParams.price = String(Math.ceil(minPrice));

	console.log('orderParams', orderParams);
	return orderParams;
};
