import { PositionSide } from '@perp/sdk-curie';
import { AlertObject, perpOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';
import config = require('config');
import 'dotenv/config';
import PerpetualConnector from './client';

export const perpBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const orderSide =
		alertMessage.order == 'buy' ? PositionSide.LONG : PositionSide.SHORT;

	let orderSize: number;
	if (alertMessage.sizeByLeverage) {
		const perp = await PerpetualConnector.build();
		if (!perp || !perp.vault)
			throw Error('Perpetual Protocol Vault is not connected');

		const accountValue = await perp.vault.getAccountValue();
		orderSize =
			(Number(accountValue) * Number(alertMessage.sizeByLeverage)) /
			Number(alertMessage.price);
	} else if (alertMessage.sizeUsd) {
		orderSize = Number(alertMessage.sizeUsd) / Number(alertMessage.price);
	} else {
		orderSize = Number(alertMessage.size);
	}

	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = orderSize * 2;
	}

	const tickerSymbol = alertMessage.market.replace('_', '');
	const side = orderSide;

	const referralCode = process.env.PERPETUAL_REFERRAL_CODE
		? process.env.PERPETUAL_REFERRAL_CODE
		: '0xibuki';

	const orderParams: perpOrderParams = {
		tickerSymbol,
		side,
		amountInput: orderSize,
		isAmountInputBase: true,
		referralCode: referralCode
	};
	console.log('orderParams for Perpetual Protocol', orderParams);
	return orderParams;
};
