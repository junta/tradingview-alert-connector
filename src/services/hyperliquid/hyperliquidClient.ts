import { AbstractDexClient } from '../abstractDexClient';
import { AlertObject } from '../../types';
import { hyperliquidGetAccount } from './getAccount';
import { hyperliquidBuildOrderParams } from './buildOrderParams';
import { hyperliquidCreateOrder } from './createOrder';
import { hyperliquidExportOrder } from './exportOrder';

export class HyperliquidClient extends AbstractDexClient {
	async getIsAccountReady(): Promise<boolean> {
		return hyperliquidGetAccount();
	}

	async placeOrder(alertMessage: AlertObject) {
		const orderParams = await hyperliquidBuildOrderParams(alertMessage);
		if (!orderParams) return;

		const orderResult = await hyperliquidCreateOrder(orderParams);
		if (!orderResult) return;

		await hyperliquidExportOrder(
			alertMessage.strategy,
			orderResult,
			alertMessage.price,
			alertMessage.market,
			alertMessage.order
		);

		return orderResult;
	}
}
