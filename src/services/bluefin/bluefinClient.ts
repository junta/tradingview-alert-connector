import {
	ORDER_SIDE,
	ORDER_TYPE,
	BluefinClient,
	Networks
} from '@bluefin-exchange/bluefin-v2-client';
import 'dotenv/config';
import { AbstractDexClient } from '../abstractDexClient';
import { AlertObject, OrderResult } from '../../types';
import { doubleSizeIfReverseOrder } from '../../helper';

export class BluefinDexClient extends AbstractDexClient {
	private client: BluefinClient;
	constructor() {
		super();
		this.client = this.getClient();
	}

	getClient(): BluefinClient {
		if (!process.env.BLUEFIN_MNEMONIC) {
			console.log('BLUEFIN_MNEMONIC is not set as environment variable');
			return;
		}

		// TODO: try to import it by private key that is started with sui...
		return new BluefinClient(
			true,
			Networks.PRODUCTION_SUI,
			process.env.BLUEFIN_MNEMONIC,
			'ED25519'
		);
	}

	async getSubAccount() {
		if (!this.client) return;

		try {
			await this.client.init();
			const account = await this.client.getUserAccountData();
			if (!account.data) {
				console.error('No account date response from Bluefin');
				return;
			}
			return account.data;
		} catch (error) {
			console.error(error);
		}
	}

	async placeOrder(alertMessage: AlertObject) {
		try {
			const subAccount = await this.getSubAccount();

			let orderSize: number;
			// if (alertMessage.sizeByLeverage) {
			// 	orderSize =
			// 		(Number(subAccount.accountValue) *
			// 			Number(alertMessage.sizeByLeverage)) /
			// 		alertMessage.price;
			// } else if (alertMessage.sizeUsd) {
			// 	orderSize = Number(alertMessage.sizeUsd) / alertMessage.price;
			// } else {
			// 	orderSize = alertMessage.size;
			// }
			orderSize = alertMessage.size;

			orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

			const side =
				alertMessage.order == 'buy' ? ORDER_SIDE.BUY : ORDER_SIDE.SELL;
			const symbol = alertMessage.market.replace('_USD', '-PERP');

			// Use 10x leverage by default
			const selectedLeverage =
				subAccount.accountDataByMarket.find(
					(market) => market.symbol === symbol
				)?.selectedLeverage || '10000000000000000000';

			const leverage = parseInt(selectedLeverage, 10) / 1e18;

			const orderParams = {
				symbol,
				price: 0,
				quantity: orderSize,
				side,
				orderType: ORDER_TYPE.MARKET,
				leverage
			};
			console.log('Bluefin order param: ', orderParams);

			const response = await this.client.postOrder(orderParams);

			console.log('Bluefin order response: ', response.data);

			const orderResult: OrderResult = {
				orderId: String(response.data.id),
				size: alertMessage.size,
				side: response.data.side
			};

			await this.exportOrder(
				'Bluefin',
				alertMessage.strategy,
				orderResult,
				alertMessage.price,
				alertMessage.market
			);

			return response.data;
		} catch (error) {
			console.error(error);
		}
	}

	async getIsAccountReady(): Promise<boolean> {
		const subAccount = await this.getSubAccount();
		if (!subAccount) return false;
		console.log('Bluefin account: ' + JSON.stringify(subAccount, null, 2));
		return Number(subAccount.accountValue) > 0;
	}
}
