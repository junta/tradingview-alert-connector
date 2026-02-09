import { AlertObject, hyperliquidOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';
import config = require('config');
import HyperliquidConnector from './client';

export const hyperliquidBuildOrderParams = async (
	alertMessage: AlertObject
) => {
	const connector = HyperliquidConnector.build();
	if (!connector) return;

	const [db, rootData] = getStrategiesDB();

	// Normalize market name: support "BTC-USD", "BTC-PERP", "BTC_USD", "BTC"
	const coin = alertMessage.market
		.replace(/-USD$/i, '')
		.replace(/-PERP$/i, '')
		.replace(/_USD$/i, '')
		.replace(/_PERP$/i, '')
		.toUpperCase();

	const isBuy = alertMessage.order === 'buy';

	// Get market metadata for asset index and size decimals
	const meta = await connector.getMeta();
	const assetInfo = meta.universe.find((a: any) => a.name === coin);
	if (!assetInfo) {
		console.error(`Asset ${coin} not found on Hyperliquid`);
		return;
	}
	const assetIndex = meta.universe.indexOf(assetInfo);
	const szDecimals: number = assetInfo.szDecimals;

	// Get mid price for size calculation and slippage
	const mids = await connector.getAllMids();
	const midPrice = parseFloat(mids[coin]);
	if (!midPrice) {
		console.error(`Could not get mid price for ${coin} on Hyperliquid`);
		return;
	}

	// Determine order size
	let orderSize: number;
	if (alertMessage.sizeByLeverage) {
		const accountState = await connector.getAccountState();
		const equity = parseFloat(accountState.marginSummary.accountValue);
		orderSize =
			(equity * Number(alertMessage.sizeByLeverage)) / midPrice;
	} else if (alertMessage.sizeUsd) {
		orderSize = Number(alertMessage.sizeUsd) / midPrice;
	} else if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy] &&
		rootData[alertMessage.strategy].isFirstOrder === 'false'
	) {
		orderSize = alertMessage.size * 2;
	} else {
		orderSize = alertMessage.size;
	}

	const sizeStr = orderSize.toFixed(szDecimals);

	// Apply slippage for IOC market-like order
	const slippage: number = config.get('Hyperliquid.User.slippage');
	const limitPrice = isBuy
		? midPrice * (1 + slippage)
		: midPrice * (1 - slippage);

	// Format price with 5 significant figures
	const priceStr = parseFloat(limitPrice.toPrecision(5)).toString();

	const orderParams: hyperliquidOrderParams = {
		coin,
		isBuy,
		size: sizeStr,
		price: priceStr,
		reduceOnly: false,
		assetIndex
	};

	console.log('orderParams for Hyperliquid', orderParams);
	return orderParams;
};
