import { AlertObject } from '../types';
import { Market } from '@dydxprotocol/v3-client';
import DYDXConnector from './client';

export const validateAlert = async (
	alertMessage: AlertObject
): Promise<boolean> => {
	// check correct alert JSON format
	if (!Object.keys(alertMessage).length) {
		console.error('tradingview alert is not JSON format.');
		return false;
	}

	// check passphrase
	if (
		alertMessage.passphrase &&
		alertMessage.passphrase != process.env.TRADINGVIEW_PASSPHRASE
	) {
		console.error('passphrase from tradingview alert does not match to config');
		return false;
	}

	// check orderSide
	if (alertMessage.order != 'buy' && alertMessage.order != 'sell') {
		console.error(
			'Side field of tradingview alert is not correct. Should be buy or sell'
		);
		return false;
	}

	//check position
	if (
		alertMessage.position != 'long' &&
		alertMessage.position != 'short' &&
		alertMessage.position != 'flat'
	) {
		console.error('position field of tradingview alert is not correct.');
		return false;
	}

	// check market
	const market = Market[alertMessage.market as keyof typeof Market];
	if (!market) {
		console.error('Market field of tradingview alert is not correct.');
		return false;
	}

	const connector = await DYDXConnector.build();

	const markets = await connector.client.public.getMarkets(market);
	// console.log('markets', markets);

	const minOrderSize = parseFloat(markets.markets[market].minOrderSize);

	// check order size is greater than mininum order size
	if (alertMessage.size < minOrderSize) {
		console.error(
			'Order size of this strategy should be greater than mininum order size:',
			minOrderSize
		);
		return false;
	}

	return true;
};
