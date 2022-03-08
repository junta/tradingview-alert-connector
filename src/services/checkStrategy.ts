/* eslint-disable @typescript-eslint/ban-types */

import config = require('config');
import { strategyObject } from '../types';

type alertObject = {
	strategy: string;
	ticker: string;
	order: string;
};

const checkStrategy = (alertMessage: alertObject) => {
	let alertStrategy;

	// console.log(alertMessage);

	const strategies: Array<strategyObject> = config.get('Strategies');
	// console.log(strategies);

	const alertStrategyArray = strategies.filter(function (
		strategy: strategyObject
	) {
		return (
			strategy.name == alertMessage['strategy'] &&
			strategy.ticker == alertMessage['ticker']
		);
	});

	if (!alertStrategyArray.length) {
		console.error('no strategy is matched');
		return;
	}

	// check duplicate setting
	if (alertStrategyArray.length == 1) {
		alertStrategy = alertStrategyArray[0];
	} else {
		console.error('duplicate strategy setting');
		return;
	}
	//check active
	if (alertStrategy.active == false) {
		console.error('this strategy is not active');
		return;
	}

	// check size is correct number
	if (alertStrategy.size <= 0) {
		console.error('size of this strategy is not correct');
		return;
	}

	console.log('Recieve strategy alert:', alertStrategy);

	return alertStrategy;
};

export default checkStrategy;
