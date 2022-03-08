/* eslint-disable @typescript-eslint/ban-types */
import { Market } from '@dydxprotocol/v3-client';

const convertDydxMarket = (ticker: string) => {
	let orderMarket;
	// TODO: should convert properly
	if (ticker == 'BTC-USD') {
		orderMarket = Market.BTC_USD;
	} else {
		orderMarket = Market.ETH_USD;
	}

	return orderMarket;
};

export default convertDydxMarket;
