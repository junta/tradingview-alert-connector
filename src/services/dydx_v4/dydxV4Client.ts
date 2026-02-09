import {
	BECH32_PREFIX,
	IndexerClient,
	CompositeClient,
	Network,
	SubaccountClient,
	ValidatorConfig,
	LocalWallet,
	OrderExecution,
	OrderSide,
	OrderTimeInForce,
	OrderType,
	IndexerConfig
} from '@dydxprotocol/v4-client-js';
import { dydxV4OrderParams, AlertObject, OrderResult } from '../../types';
import { _sleep, doubleSizeIfReverseOrder } from '../../helper';
import 'dotenv/config';
import config from 'config';
import crypto from 'crypto';
import { AbstractDexClient } from '../abstractDexClient';

export class DydxV4Client extends AbstractDexClient {

	// =========================
	// ACCOUNT
	// =========================

	async getIsAccountReady() {
		const subAccount = await this.getSubAccount();
		if (!subAccount) return false;
		return Number(subAccount.freeCollateral) > 0;
	}

	async getSubAccount() {
		try {
			const client = this.buildIndexerClient();
			const localWallet = await this.generateLocalWallet();
			if (!localWallet) return;
			const response = await client.account.getSubaccount(localWallet.address, 0);
			return response.subaccount;
		} catch (error) {
			console.error(error);
		}
	}

	// =========================
	// ORDER PARAMS
	// =========================

	async buildOrderParams(alertMessage: AlertObject) {
		const orderSide =
			alertMessage.order === 'buy' ? OrderSide.BUY : OrderSide.SELL;

		const latestPrice = Number(alertMessage.price);

		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const account = await this.getSubAccount();
			orderSize =
				(Number(account.equity) * Number(alertMessage.sizeByLeverage)) /
				latestPrice;
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / latestPrice;
		} else {
			orderSize = Number(alertMessage.size);
		}

		orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

		return {
			market: alertMessage.market.replace(/_/g, '-'),
			side: orderSide,
			size: Number(orderSize),
			price: latestPrice
		} as dydxV4OrderParams;
	}

	// =========================
	// MAIN ORDER FUNCTION
	// =========================

	async placeOrder(alertMessage: AlertObject) {
		const orderParams = await this.buildOrderParams(alertMessage);
		const { client, subaccount } = await this.buildCompositeClient();

		const clientId = this.generateDeterministicClientId(alertMessage);
		console.log('Deterministic Client ID:', clientId);

		const price =
			orderParams.side === OrderSide.BUY
				? orderParams.price * 1.05
				: orderParams.price * 0.95;

		const maxTries = 3;
		const fillWaitTime = 60000;
		let count = 0;

		while (count <= maxTries) {
			try {
				const tx = await client.placeOrder(
					subaccount,
					orderParams.market,
					OrderType.MARKET,
					orderParams.side,
					price,
					orderParams.size,
					clientId,
					OrderTimeInForce.GTT,
					120000,
					OrderExecution.DEFAULT,
					false,
					false,
					null
				);

				console.log('Transaction Result:', tx);
				await _sleep(fillWaitTime);

				const isFilled = await this.isOrderFilled(String(clientId));
				if (!isFilled)
					throw new Error('Order not filled yet');

				const orderResult: OrderResult = {
					side: orderParams.side,
					size: orderParams.size,
					orderId: String(clientId)
				};

				await this.exportOrder(
					'DydxV4',
					alertMessage.strategy,
					orderResult,
					alertMessage.price,
					alertMessage.market
				);

				return orderResult;

			} catch (error) {
				console.error(error);
				count++;
				if (count > maxTries) throw error;
				await _sleep(5000);
			}
		}
	}

	// =========================
	// CLIENT BUILDERS
	// =========================

	private buildCompositeClient = async () => {
		const validatorConfig = new ValidatorConfig(
			config.get('DydxV4.ValidatorConfig.restEndpoint'),
			'dydx-mainnet-1',
			{
				CHAINTOKEN_DENOM: 'adydx',
				CHAINTOKEN_DECIMALS: 18,
				USDC_DENOM: config.get('DydxV4.USDC_DENOM'),
				USDC_GAS_DENOM: 'uusdc',
				USDC_DECIMALS: 6
			}
		);

		const network =
			process.env.NODE_ENV === 'production'
				? new Network('mainnet', this.getIndexerConfig(), validatorConfig)
				: Network.testnet();

		const client = await CompositeClient.connect(network);
		const localWallet = await this.generateLocalWallet();
		const subaccount = new SubaccountClient(localWallet, 0);

		return { client, subaccount };
	};

	private generateLocalWallet = async () => {
		if (!process.env.DYDX_V4_MNEMONIC) return;
		return LocalWallet.fromMnemonic(
			process.env.DYDX_V4_MNEMONIC,
			BECH32_PREFIX
		);
	};

	private buildIndexerClient = () => {
		const cfg =
			process.env.NODE_ENV === 'production'
				? this.getIndexerConfig()
				: Network.testnet().indexerConfig;
		return new IndexerClient(cfg);
	};

	private getIndexerConfig = () =>
		new IndexerConfig(
			config.get('DydxV4.IndexerConfig.httpsEndpoint'),
			config.get('DydxV4.IndexerConfig.wssEndpoint')
		);

	// =========================
	// 🔑 DETERMINISTIC CLIENT ID
	// =========================

	private generateDeterministicClientId(alert: AlertObject): number {
		const raw = `${alert.strategy}|${alert.market}|${alert.order}|${alert.time}`;
		const hash = crypto.createHash('sha256').update(raw).digest('hex');
		return parseInt(hash.substring(0, 8), 16);
	}

	// =========================
	// ORDER CHECKS
	// =========================

	private isOrderFilled = async (clientId: string): Promise<boolean> => {
		const orders = await this.getOrders();
		const order = orders.find(o => o.clientId === clientId);
		return order?.status === 'FILLED';
	};

	getOrders = async () => {
		const client = this.buildIndexerClient();
		const wallet = await this.generateLocalWallet();
		if (!wallet) return [];
		return client.account.getSubaccountOrders(wallet.address, 0);
	};
}

