import * as ccxt from 'ccxt';
import {
	dydxV4OrderParams,
	AlertObject,
	OrderResult,
	MarketData
} from '../../types';
import { _sleep, doubleSizeIfReverseOrder } from '../../helper';
import 'dotenv/config';
import {
	OrderSide,
	OrderTimeInForce,
	OrderType
} from '@dydxprotocol/v4-client-js';
import { AbstractDexClient } from '../abstractDexClient';

export class HyperLiquidClient extends AbstractDexClient {
	private client: ccxt.hyperliquid;

	constructor() {
		super();

		if (
			!process.env.HYPERLIQUID_PRIVATE_KEY &&
			!process.env.HYPERLIQUID_WALLET_ADDRESS
		) {
			console.log('HyperLiquid Credentials is not set as environment variable');
		}

		this.client = new ccxt.hyperliquid({
			privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
			walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS
		});

		if (process.env.NODE_ENV !== 'production') this.client.setSandboxMode(true);
	}

	async getIsAccountReady(): Promise<boolean> {
		try {
			const clientId = this.generateRandomHexString(32);
			console.log('Client ID: ', clientId);

			// const result = await this.client.createOrder(
			// 	'WIF/USDC:USDC',
			// 	'LIMIT',
			// 	'BUY',
			// 	6,
			// 	2,
			// 	{
			// 		clientOrderId: clientId,
			// 		timeInForce: 'gtc',
			// 		postOnly: false,
			// 		reduceOnly: false
			// 		// vaultAddress: process.env.HYPERLIQUID_VAULT_ADDRESS
			// 	}
			// );
			// console.log('Transaction Result: ', result);
			// console.log(await this.client.fetchOrder(result.id, 'WIF/USDC:USDC'));

			console.log((await this.getOpenedPositions()).at(-1));
			return true;
		} catch (e) {
			console.log(e);
			return false;
		}
	}

	async buildOrderParams(alertMessage: AlertObject) {
		const orderSide =
			alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

		const latestPrice = alertMessage.price;
		console.log('latestPrice', latestPrice);

		let orderSize: number;
		orderSize = alertMessage.size;

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

	async placeOrder(alertMessage: AlertObject, openedPositions: MarketData[]) {
		const orderParams = await this.buildOrderParams(alertMessage);

		const market = orderParams.market;
		const type = OrderType.LIMIT;
		const side = orderParams.side;
		const timeInForce = OrderTimeInForce.GTT;

		// Since we are using LIMIT type, referring to exchange, that orders don't have slippage
		const slippagePercentage = parseFloat(alertMessage.slippagePercentage); // Get from alert
		const vaultAddress = process.env.HYPERLIQUID_VAULT_ADDRESS;
		const orderMode = alertMessage.orderMode || '';
		const price =
			side == OrderSide.BUY
				? orderParams.price * (1 + slippagePercentage)
				: orderParams.price * (1 - slippagePercentage);
		let size = orderParams.size;

		if (side === OrderSide.SELL) {
			const tickerPositions = openedPositions.filter(
				(el) => el.market === market
			);
			const sum = tickerPositions.reduce(
				(acc: number, cur) => acc + parseFloat(cur.size),
				0
			);

			// If no opened positions
			if (sum === 0) return;

			size = orderMode === 'full' ? sum : Math.max(size, sum);
		}

		const postOnly = false;
		const reduceOnly = false;

		const fillWaitTime = Number(process.env.FILL_WAIT_TIME_SECONDS) || 300; // 5 minutes by default

		const clientId = this.generateRandomInt32();
		console.log('Client ID: ', clientId);

		// For cancelling if needed
		let orderId: string;

		try {
			const result = await this.client.createOrder(
				market,
				type,
				side,
				size,
				price,
				{
					clientOrderId: clientId,
					timeInForce,
					slippage: alertMessage.slippagePercentage,
					postOnly,
					reduceOnly,
					vaultAddress
				}
			);
			console.log('Transaction Result: ', result);
			orderId = result.id;
		} catch (e) {
			console.error(e);
		}
		await _sleep(fillWaitTime);

		const isFilled = await this.isOrderFilled(orderId, market);
		if (!isFilled) {
			await this.client.cancelOrder(orderId, market, {
				clientOrderId: clientId
			});
		}
		const orderResult: OrderResult = {
			side: orderParams.side,
			size: orderParams.size,
			orderId: String(clientId)
		};

		return orderResult;
	}

	private generateRandomInt32(): number {
		const maxInt32 = 2147483647;
		return Math.floor(Math.random() * (maxInt32 + 1));
	}

	private generateRandomHexString(size: number): string {
		return `0x${[...Array(size)]
			.map(() => Math.floor(Math.random() * 16).toString(16))
			.join('')}`;
	}

	private isOrderFilled = async (
		orderId: string,
		market: string
	): Promise<boolean> => {
		const order = await this.client.fetchOrder(orderId, market);

		console.log('HyperLiquid Order ID: ', order.id);

		return order.status == 'closed';
	};

	getOpenedPositions = async (): Promise<ccxt.Position[]> => {
		return await this.client.fetchPositions();
	};
}
