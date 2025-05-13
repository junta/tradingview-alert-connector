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
import { getEnvVar, ProfileName } from '../../utils/envLoader';

export class BluefinDexClient extends AbstractDexClient {
	private client: BluefinClient;
	private profile: ProfileName;
	constructor(alertMessage: AlertObject) {
		super();
		this.profile = alertMessage.envProfile || ""; 
		this.client = this.getClient();
	}

	getClient(): BluefinClient {
		const mnemonic = getEnvVar('BLUEFIN_MNEMONIC', this.profile);

		if (!mnemonic) {
			console.log(`BLUEFIN_MNEMONIC${this.profile ? '_' + this.profile : ''}is not set as environment variable`);
			return;
		}

		// TODO: try to import it by private key that is started with sui...
		try {
			return new BluefinClient(
				true,
				Networks.PRODUCTION_SUI,
				mnemonic,
				'ED25519'
			);
		} catch (e) {
			console.error(e);
		}
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

			const symbol = alertMessage.market.replace('_USD', '-PERP');

			let orderSize: number;
			if (alertMessage.sizeByLeverage) {
				const account = await this.getSubAccount();

				const rawOrderSize =
					((Number(account.accountValue) / 1e18) *
						alertMessage.sizeByLeverage) /
					alertMessage.price;
				orderSize = await this.adjustOrderSize(rawOrderSize, symbol);
			} else if (alertMessage.sizeUsd) {
				orderSize = await this.adjustOrderSize(
					alertMessage.sizeUsd / alertMessage.price,
					symbol
				);
			} else {
				orderSize = alertMessage.size;
			}

			orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

			const side =
				alertMessage.order == 'buy' ? ORDER_SIDE.BUY : ORDER_SIDE.SELL;

			let selectedLeverage = subAccount.accountDataByMarket.find(
				(market) => market.symbol === symbol
			)?.selectedLeverage;

			// Use default leverage
			if (!selectedLeverage) {
				selectedLeverage =
					symbol == 'BTC-PERP' || symbol == 'ETH-PERP'
						? '3000000000000000000'
						: '10000000000000000000';
			}

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

	async adjustOrderSize(orderSize: number, symbol: string): Promise<number> {
		try {
			const resp = await this.client.getExchangeInfo(symbol);

			const minOrderSizeNumber = Number(resp.data.minOrderSize) / 10 ** 18;

			// Calculate adjusted order size by rounding down to the nearest multiple of minOrderSize
			const adjustedOrderSizeNumber =
				Math.floor(orderSize / minOrderSizeNumber) * minOrderSizeNumber;

			// Convert the adjusted order size to a string with a fixed number of decimal places
			const adjustedOrderSizeString = adjustedOrderSizeNumber.toFixed(18);

			return parseFloat(adjustedOrderSizeString);
		} catch (e) {
			console.error(e);
		}
	}
}
