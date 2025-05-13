import { AbstractDexClient } from '../abstractDexClient';
import {
	DydxClient,
	OrderResponseObject,
	FillResponseObject,
	OrderSide,
	Market,
	OrderType,
	TimeInForce
} from '@dydxprotocol/v3-client';
import * as fs from 'fs';
import config = require('config');
import 'dotenv/config';
import { dydxOrderParams, AlertObject, OrderResult } from '../../types';
import {
	_sleep,
	doubleSizeIfReverseOrder,
	getDecimalPointLength,
	getStrategiesDB
} from '../../helper';
import { getEnvVar, ProfileName } from '../../utils/envLoader';

export class DydxV3Client extends AbstractDexClient {
	client: DydxClient | undefined;
	positionID = '0';
	private profile: ProfileName;

	public constructor(alertMessage?: AlertObject) {
		super();
		this.profile = alertMessage?.envProfile || '';
		if (
			!getEnvVar('API_KEY', this.profile) ||
			!getEnvVar('API_PASSPHRASE', this.profile) ||
			!getEnvVar('API_SECRET', this.profile)
		) {
			console.log('API Key for dYdX is not set as environment variable');
			return;
		}
		if (!getEnvVar('STARK_PUBLIC_KEY', this.profile) || !getEnvVar('STARK_PRIVATE_KEY', this.profile)) {
			console.log('STARK Key for dYdX is not set as environment variable');
			return;
		}

		const apiKeys = {
			key: getEnvVar('API_KEY', this.profile),
			passphrase: getEnvVar('API_PASSPHRASE', this.profile),
			secret: getEnvVar('API_SECRET', this.profile)
		};

		const starkKeyPair = {
			publicKey: getEnvVar('STARK_PUBLIC_KEY', this.profile),
			privateKey: getEnvVar('STARK_PRIVATE_KEY', this.profile)
		};

		this.client = new DydxClient(config.get('Dydx.Network.host'), {
			apiTimeout: 3000,
			networkId: config.get('Dydx.Network.chainID'),
			apiKeyCredentials: apiKeys,
			starkPrivateKey: starkKeyPair
		});

		// Initizlize positionID immediately
		this.initializePositionID();
	}

	private async initializePositionID() {
		try {
			if (!this.client) return;
			
			const account = await this.client.private.getAccount(
				getEnvVar('ETH_ADDRESS', this.profile)
			);
			this.positionID = account.account.positionId;
		} catch (error) {
			console.error("Failed to initialize positionID:", error);
		}
	}

	getIsAccountReady = async () => {
		try {
			if (!this.client) return false;

			const account = await this.client.private.getAccount(
				getEnvVar('ETH_ADDRESS', this.profile)
			);
			console.log('dYdX account: ', account);
			return (Number(account.account.freeCollateral) > 0) as boolean;
		} catch (error) {
			console.error(error);
			return false;
		}
	};

	placeOrder = async (alertMessage: AlertObject) => {
		if (!this.client) return false;

		const market = Market[alertMessage.market as keyof typeof Market];
		if (!market) {
			console.error('Market field of tradingview alert is not correct.');
			return false;
		}

		const markets = await this.client.public.getMarkets(market);
		// console.log('markets', markets);

		const minOrderSize = parseFloat(markets.markets[market].minOrderSize);

		// check order size is greater than mininum order size
		if (alertMessage.size && alertMessage.size < minOrderSize) {
			console.error(
				'Order size of this strategy must be greater than mininum order size:',
				minOrderSize
			);
			return false;
		}

		const orderParams = await this.buildOrderParams(alertMessage);

		let count = 0;
		const maxTries = 3;
		while (count <= maxTries) {
			try {
				if (!this.client) return false;

				const orderResponseObject: { order: OrderResponseObject } =
					await this.client.private.createOrder(
						orderParams,
						this.positionID
					);

				// console.log(orderResult.order);

				console.log(
					new Date() + ' placed order market:',
					orderParams.market,
					'side:',
					orderParams.side,
					'price:',
					orderParams.price,
					'size:',
					orderParams.size
				);

				const orderResult: OrderResult = {
					orderId: orderResponseObject.order.id,
					size: Number(orderResponseObject.order.size),
					side: orderResponseObject.order.side
				};

				this.exportOrder(
					'DydxV3',
					alertMessage.strategy,
					orderResult,
					alertMessage.price,
					alertMessage.market
				);

				return orderResult;
			} catch (error) {
				count++;
				if (count == maxTries) {
					console.error(error);
				}
				await _sleep(5000);
			}
		}

		return false;
	};

	private buildOrderParams = async (alertMessage: AlertObject) => {
		if (!this.client) return;
		
		// set expiration datetime. must be more than 1 minute from current datetime
		const date = new Date();
		date.setMinutes(date.getMinutes() + 2);
		const dateStr = date.toJSON();

		const market = Market[alertMessage.market as keyof typeof Market];
		const marketsData = await this.client.public.getMarkets(market);
		// console.log('markets', markets);

		const orderSide =
			alertMessage.order == 'buy' ? OrderSide.BUY : OrderSide.SELL;

		const latestPrice = parseFloat(marketsData.markets[market].oraclePrice);
		console.log('latestPrice', latestPrice);

		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const account = await this.client.private.getAccount(
				getEnvVar('ETH_ADDRESS', this.profile)
			);
			const equity = Number(account.account.equity);
			orderSize = (equity * Number(alertMessage.sizeByLeverage)) / latestPrice;
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / latestPrice;
		} else {
			orderSize = alertMessage.size;
		}

		orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

		const stepSize = parseFloat(marketsData.markets[market].stepSize);
		const stepDecimal = getDecimalPointLength(stepSize);
		const orderSizeStr = Number(orderSize).toFixed(stepDecimal);

		const tickSize = parseFloat(marketsData.markets[market].tickSize);

		const slippagePercentage = 0.05;
		const minPrice =
			orderSide == OrderSide.BUY
				? latestPrice * (1 + slippagePercentage)
				: latestPrice * (1 - slippagePercentage);

		const decimal = getDecimalPointLength(tickSize);
		const price = minPrice.toFixed(decimal);

		const orderParams: dydxOrderParams = {
			market: market,
			side: orderSide,
			type: OrderType.MARKET,
			timeInForce: TimeInForce.FOK,
			postOnly: false,
			size: orderSizeStr,
			price: price,
			limitFee: config.get('Dydx.User.limitFee'),
			expiration: dateStr
		};
		console.log('orderParams for dydx', orderParams);
		return orderParams;
	};

	override exportOrder = async (
		exchange: string,
		strategy: string,
		orderResult: OrderResult,
		tradingviewPrice: number,
		market: string
	) => {
		_sleep(2000);
		const result = await this.getOrder(orderResult.orderId);
		if (!result) {
			return;
		}
		console.log('result', result);

		let price;
		if (result.order.status == 'FILLED') {
			const fill = await this.getFill(orderResult.orderId);
			price = fill ? fill.price : '';

			console.log('order id:', orderResult.orderId, 'is filled at', price);

			const [db, rootData] = getStrategiesDB();
			const rootPath = '/' + strategy;
			const isFirstOrderPath = rootPath + '/isFirstOrder';
			db.push(isFirstOrderPath, 'false');

			// Store position data
			const positionPath = rootPath + '/position';
			const position: number =
				orderResult.side == 'BUY'
					? Number(orderResult.size)
					: -1 * Number(orderResult.size);

			const storedSize = rootData[strategy].position
				? rootData[strategy].position
				: 0;

			db.push(positionPath, storedSize + position);
		} else {
			price = '';
		}

		const environment =
			config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
		const folderPath = './data/exports/' + environment;
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath, {
				recursive: true
			});
		}

		const fullPath = folderPath + `/tradeHistory${exchange}.csv`;
		if (!fs.existsSync(fullPath)) {
			const headerString =
				'datetime,strategy,market,side,size,orderPrice,tradingviewPrice,priceGap,status,orderId,accountId';
			fs.writeFileSync(fullPath, headerString);
		}

		// export price gap between tradingview price and ordered price
		const priceGap = Number(price) - tradingviewPrice;
		const appendArray = [
			result.order.createdAt,
			strategy,
			market,
			result.order.side,
			result.order.size,
			price,
			tradingviewPrice,
			priceGap,
			result.order.status,
			result.order.id,
			result.order.accountId
		];
		const appendString = '\r\n' + appendArray.join();

		fs.appendFileSync(fullPath, appendString);
	};

	private getFill = async (order_id: string) => {
		if (!this.client) return;

		let count = 0;
		const maxTries = 3;
		while (count <= maxTries) {
			try {
				const allFills: { fills: FillResponseObject[] } =
					await this.client.private.getFills({ orderId: order_id });

				return allFills.fills[0];
			} catch (error) {
				count++;
				if (count == maxTries) {
					console.error(error);
				}
				await _sleep(5000);
			}
		}
	};

	private getOrder = async (order_id: string) => {
		if (!this.client) return;
		
		let count = 0;
		const maxTries = 3;
		let filled;
		while (count <= maxTries && !filled) {
			try {
				const orderResponse: { order: OrderResponseObject } =
					await this.client.private.getOrderById(order_id);

				count++;
				filled = orderResponse.order.status == 'FILLED' ? true : false;

				if (filled) {
					return orderResponse;
				}
			} catch (error) {
				count++;
				filled = false;
				if (count == maxTries) {
					console.error(error);
				}
				await _sleep(5000);
			}
		}
	};
}