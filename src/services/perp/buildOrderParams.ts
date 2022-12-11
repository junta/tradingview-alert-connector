import { PositionSide } from '@perp/sdk-curie';
import { AlertObject, perpOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';

export const perpBuildOrderParams = async (alertMessage: AlertObject) => {
	const [db, rootData] = getStrategiesDB();

	const orderSide =
		alertMessage.order == 'buy' ? PositionSide.LONG : PositionSide.SHORT;

	let orderSize: number;
	if (
		alertMessage.reverse &&
		rootData[alertMessage.strategy].isFirstOrder == 'false'
	) {
		orderSize = alertMessage.size * 2;
	} else {
		orderSize = alertMessage.size;
	}

	const tickerSymbol = alertMessage.market.replace('_', '');
	const side = orderSide;

	const orderParams: perpOrderParams = {
		tickerSymbol,
		side,
		amountInput: orderSize,
		isAmountInputBase: true
	};
	console.log('orderParams for Perpetual Protocol', orderParams);
	return orderParams;
};
