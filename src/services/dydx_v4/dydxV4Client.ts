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
import { AbstractDexClient } from '../abstractDexClient';

export class DydxV4Client extends AbstractDexClient {
	async getIsAccountReady() {
		const subAccount = await this.getSubAccount();
		if (!subAccount) return false;

		console.log('dydx v4 account: ' + JSON.stringify(subAccount, null, 2));
		return (Number(subAccount.freeCollateral) > 0) as boolean;
	}

	async getSubAccount() {
		try {
			const client = this.buildIndexerClient();
			const localWallet = await this.generateLocalWallet();
			if (!localWallet) return;
			const response = await client.account.getSubaccount(
				localWallet.address,
				0
			);

			return response.subaccount;
		} catch (error) {
			console.error(error);
		}
	}

	async buildOrderParams(alertMessage: AlertObject) {
		const orderSide =
			alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

		const latestPrice = alertMessage.price;
		console.log('latestPrice', latestPrice);

		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const account = await this.getSubAccount();

			orderSize =
				(Number(account.equity) * Number(alertMessage.sizeByLeverage)) /
				latestPrice;
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / latestPrice;
		} else {
			orderSize = alertMessage.size;
		}

		orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

		const market = alertMessage.market.replace(/_/g, '-');

		const orderParams: dydxV4OrderParams = {
			market,
			side: orderSide,
			size: Number(orderSize),
			price: Number(alertMessage.price)
		};
		console.log('orderParams for dydx', orderParams);
		return orderParams;
	}

	async placeOrder(alertMessage: AlertObject) {
		const orderParams = await this.buildOrderParams(alertMessage);
		const { client, subaccount } = await this.buildCompositeClient();

		const market = orderParams.market;
		const type = OrderType.MARKET;
		const side = orderParams.side;
		const timeInForce = OrderTimeInForce.GTT;
		const execution = OrderExecution.DEFAULT;
		const slippagePercentage = 0.05;
		const price =
			side == OrderSide.BUY
				? orderParams.price * (1 + slippagePercentage)
				: orderParams.price * (1 - slippagePercentage);
		const size = orderParams.size;
		const postOnly = false;
		const reduceOnly = false;
		const triggerPrice = null;
		let count = 0;
		const maxTries = 3;
		const fillWaitTime = 60000; // 1 minute
		while (count <= maxTries) {
			try {
				const clientId = this.generateRandomInt32();
				console.log('Client ID: ', clientId);

				const tx = await client.placeOrder(
					subaccount,
					market,
					type,
					side,
					price,
					size,
					clientId,
					timeInForce,
					120000, // 2 minute
					execution,
					postOnly,
					reduceOnly,
					triggerPrice
				);
				console.log('Transaction Result: ', tx);
				await _sleep(fillWaitTime);

				const isFilled = await this.isOrderFilled(String(clientId));
				if (!isFilled)
					throw new Error(
						'Order is not found/filled. Retry again, count: ' + count
					);
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
				console.log('Retry again, count: ' + count);
				count++;

				await _sleep(5000);
			}
		}
	}

	private buildCompositeClient = async () => {
		const validatorConfig = new ValidatorConfig(
			config.get('DydxV4.ValidatorConfig.restEndpoint'),
			'dydx-mainnet-1',
			{
				CHAINTOKEN_DENOM: 'adydx',
				CHAINTOKEN_DECIMALS: 18,
				USDC_DENOM:
					'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
				USDC_GAS_DENOM: 'uusdc',
				USDC_DECIMALS: 6
			}
		);
		const network =
			process.env.NODE_ENV == 'production'
				? new Network('mainnet', this.getIndexerConfig(), validatorConfig)
				: Network.testnet();
		let client;
		try {
			client = await CompositeClient.connect(network);
		} catch (e) {
			console.error(e);
			throw new Error('Failed to connect to dYdX v4 client');
		}

		const localWallet = await this.generateLocalWallet();
		const subaccount = new SubaccountClient(localWallet, 0);
		return { client, subaccount };
	};

	private generateLocalWallet = async () => {
		if (!process.env.DYDX_V4_MNEMONIC) {
			console.log('DYDX_V4_MNEMONIC is not set as environment variable');
			return;
		}

		const localWallet = await LocalWallet.fromMnemonic(
			process.env.DYDX_V4_MNEMONIC,
			BECH32_PREFIX
		);
		console.log('dYdX v4 Address:', localWallet.address);

		return localWallet;
	};

	private buildIndexerClient = () => {
		const mainnetIndexerConfig = this.getIndexerConfig();
		const indexerConfig =
			process.env.NODE_ENV !== 'production'
				? Network.testnet().indexerConfig
				: mainnetIndexerConfig;
		return new IndexerClient(indexerConfig);
	};

	private getIndexerConfig = () => {
		return new IndexerConfig(
			config.get('DydxV4.IndexerConfig.httpsEndpoint'),
			config.get('DydxV4.IndexerConfig.wssEndpoint')
		);
	};

	private generateRandomInt32(): number {
		const maxInt32 = 2147483647;
		return Math.floor(Math.random() * (maxInt32 + 1));
	}

	private isOrderFilled = async (clientId: string): Promise<boolean> => {
		const orders = await this.getOrders();

		const order = orders.find((order) => {
			return order.clientId == clientId;
		});
		if (!order) return false;

		console.log('dYdX v4 Order ID: ', order.id);

		return order.status == 'FILLED';
	};

	getOrders = async () => {
		const client = this.buildIndexerClient();
		const localWallet = await this.generateLocalWallet();
		if (!localWallet) return;

		return await client.account.getSubaccountOrders(localWallet.address, 0);
	};
}
