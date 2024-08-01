import * as ccxt from 'ccxt';
import { dydxV4OrderParams, AlertObject, OrderResult } from '../../types';
import {
	_sleep,
	calculateProfit,
	doubleSizeIfReverseOrder
} from '../../helper';
import 'dotenv/config';
import { OrderSide, OrderType } from '@dydxprotocol/v4-client-js';
import { AbstractDexClient } from '../abstractDexClient';
import { Mutex } from 'async-mutex';

export class HyperLiquidClient extends AbstractDexClient {
	private client: ccxt.hyperliquid;

	constructor() {
		super();

		if (
			!process.env.HYPERLIQUID_PRIVATE_KEY ||
			!process.env.HYPERLIQUID_WALLET_ADDRESS
		) {
			console.log(
				'HyperLiquid credentials are not set as environment variable'
			);
		}

		this.client = new ccxt.hyperliquid({
			privateKey: process.env.HYPERLIQUID_PRIVATE_KEY,
			walletAddress: process.env.HYPERLIQUID_WALLET_ADDRESS
		});

		if (process.env.NODE_ENV !== 'production') this.client.setSandboxMode(true);
	}

	async getIsAccountReady(): Promise<boolean> {
		try {
			// Fetched balance indicates connected wallet
			await this.client.fetchBalance();
			return true;
		} catch (e) {
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
		console.log('orderParams for hyperliquid', orderParams);
		return orderParams;
	}

	async placeOrder(
		alertMessage: AlertObject,
		openedPositions: ccxt.Position[],
		mutex: Mutex
	) {
		const orderParams = await this.buildOrderParams(alertMessage);

		const market = orderParams.market;
		const type = OrderType.LIMIT;
		const side = orderParams.side;
		const timeInForce = 'gtc';
		const slippagePercentage = parseFloat(alertMessage.slippagePercentage); // Get from alert
		const vaultAddress = process.env.HYPERLIQUID_VAULT_ADDRESS;
		const orderMode = alertMessage.orderMode || '';
		const price =
			side == OrderSide.BUY
				? orderParams.price * ((100 + slippagePercentage) / 100)
				: orderParams.price * ((100 - slippagePercentage) / 100);

		let size = orderParams.size;

		if (side === OrderSide.SELL) {
			// Hyperliquid group all positions in one position per symbol
			const position = openedPositions.find((el) => el.symbol === market);

			if (!position) return;

			const profit = calculateProfit(price, position.entryPrice);
			const minimumProfit = parseFloat(process.env.MINIMUM_PROFIT_PERCENT) || 0;

			if (profit < minimumProfit) return;

			const sum = position.contracts;

			size = orderMode === 'full' ? sum : Math.max(size, sum);
		}

		const postOnly = false;
		const reduceOnly = false;

		const fillWaitTime =
			parseInt(process.env.FILL_WAIT_TIME_SECONDS) * 1000 || 300 * 1000; // 5 minutes by default

		const clientId = this.generateRandomHexString(32);
		console.log('Client ID: ', clientId);

		// For cancelling if needed
		let orderId: string;

		// This solution fixes problem of two parallel calls in exchange, which is not possible
		const release = await mutex.acquire();

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
					postOnly,
					reduceOnly,
					...(vaultAddress && { vaultAddress })
				}
			);
			console.log('[Hyperliquid] Transaction Result: ', result);
			orderId = result.id;
		} catch (e) {
			console.error(e);
		} finally {
			release();
		}

		await _sleep(fillWaitTime);

		const isFilled = await this.isOrderFilled(orderId, market, {
			...(vaultAddress && { user: vaultAddress })
		});
		if (!isFilled) {
			const release = await mutex.acquire();

			try {
				await this.client.cancelOrder(orderId, market, {
					clientOrderId: clientId,
					...(vaultAddress && { vaultAddress })
				});
				console.log(`HyperLiquid Order ID ${orderId} canceled`);
			} catch (e) {
				console.log(e);
			} finally {
				release();
			}
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
		market: string,
		params: { user?: string }
	): Promise<boolean> => {
		const order = await this.client.fetchOrder(orderId, market, params);

		console.log('HyperLiquid Order ID: ', order.id);

		return order.status == 'closed';
	};

	getOpenedPositions = async (): Promise<ccxt.Position[]> => {
		return await this.client.fetchPositions();
	};
}
