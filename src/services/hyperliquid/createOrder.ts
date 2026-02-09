import { hyperliquidOrderParams } from '../../types';
import { _sleep } from '../../helper';
import HyperliquidConnector from './client';
import config = require('config');
import 'dotenv/config';

let referrerAttempted = false;

export const hyperliquidCreateOrder = async (
	orderParams: hyperliquidOrderParams
) => {
	let count = 0;
	const maxTries = 3;
	while (count <= maxTries) {
		try {
			const connector = HyperliquidConnector.build();
			if (!connector) return;

			// Attempt to set referrer on first order
			if (!referrerAttempted) {
				referrerAttempted = true;
				const referralCode = process.env.HYPERLIQUID_REFERRAL_CODE;
				if (referralCode) {
					await connector.setReferrer(referralCode);
				}
			}

			// Build optional builder fee
			let builder: { b: string; f: number } | undefined;
			const builderAddress = process.env.HYPERLIQUID_BUILDER_ADDRESS;
			if (builderAddress) {
				const builderFee: number = config.get(
					'Hyperliquid.User.builderFee'
				);
				builder = { b: builderAddress, f: builderFee };
			}

			const result = await connector.placeOrder(
				orderParams.assetIndex,
				orderParams.isBuy,
				orderParams.price,
				orderParams.size,
				orderParams.reduceOnly,
				builder
			);

			if (result.status === 'err') {
				throw new Error(
					`Hyperliquid order error: ${result.response}`
				);
			}

			console.log(
				new Date() + ' placed order on Hyperliquid market:',
				orderParams.coin,
				'side:',
				orderParams.isBuy ? 'BUY' : 'SELL',
				'price:',
				orderParams.price,
				'size:',
				orderParams.size
			);

			return result;
		} catch (error) {
			count++;
			if (count == maxTries) {
				console.error(error);
			}
			await _sleep(5000);
		}
	}
};
