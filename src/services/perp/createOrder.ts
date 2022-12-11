import { perpOrderParams } from '../../types';
import { _sleep } from '../../helper';
import PerpetualConnector from './client';
import Big from 'big.js';
import config = require('config');

export const perpCreateOrder = async (orderParams: perpOrderParams) => {
	let count = 0;
	const maxTries = 3;
	while (count <= maxTries) {
		try {
			const perp = await PerpetualConnector.build();
			if (!perp || !perp.clearingHouse) return;

			const newPositionDraft = perp.clearingHouse.createPositionDraft({
				tickerSymbol: orderParams.tickerSymbol,
				side: orderParams.side,
				amountInput: new Big(orderParams.amountInput),
				isAmountInputBase: orderParams.isAmountInputBase
			});
			const slippage = new Big(config.get('Perpetual.User.slippage'));
			const orderResult = await perp.clearingHouse.openPosition(
				newPositionDraft,
				slippage
			);

			// console.log(orderResult.order);

			console.log(
				new Date() + ' placed order market:',
				orderParams.tickerSymbol,
				'side:',
				orderParams.side,
				'size:',
				orderParams.amountInput
			);

			return orderResult;
		} catch (error) {
			count++;
			if (count == maxTries) {
				console.error(error);
			}
			await _sleep(5000);
		}
	}
};
