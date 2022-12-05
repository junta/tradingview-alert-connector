import { PositionSide } from '@perp/sdk-curie';
import { AlertObject, perpOrderParams } from '../../types';
import { getStrategiesDB } from '../../helper';

export const perpBuildOrderParams = async (alertMessage: AlertObject) => {
	// TODO: extract
	const db = getStrategiesDB();

	const rootData = db.getData('/');
	console.log('strategyData', rootData[alertMessage.strategy]);

	const rootPath = '/' + alertMessage.strategy;

	if (!rootData[alertMessage.strategy]) {
		const reversePath = rootPath + '/reverse';
		db.push(reversePath, alertMessage.reverse);

		const isFirstOrderPath = rootPath + '/isFirstOrder';
		db.push(isFirstOrderPath, 'true');
	}

	if (
		alertMessage.position == 'flat' &&
		rootData[alertMessage.strategy].isFirstOrder == 'true'
	) {
		console.log(
			'this alert is first and close order, so does not create a new order.'
		);
		return;
	}

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
