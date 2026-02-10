import { AbstractDexClient } from '../abstractDexClient';
import { AlertObject, hyperliquidOrderParams } from '../../types';
import { _sleep, getStrategiesDB } from '../../helper';
import { HttpTransport, InfoClient, ExchangeClient } from '@nktkas/hyperliquid';
import { ethers } from 'ethers';
import * as fs from 'fs';
import config = require('config');
import 'dotenv/config';

const REFERRAL_CODE = '0XIBUKI';
const BUILDER_ADDRESS: `0x${string}` =
	'0x0000000000000000000000000000000000000000';

export class HyperliquidHelper {
	readonly info: InfoClient;
	readonly exchange: ExchangeClient;
	readonly address: string;

	constructor(info: InfoClient, exchange: ExchangeClient, address: string) {
		this.info = info;
		this.exchange = exchange;
		this.address = address;
	}

	static build(): HyperliquidHelper | null {
		if (!process.env.HYPERLIQUID_PRIVATE_KEY) {
			console.log('HYPERLIQUID_PRIVATE_KEY is not set as environment variable');
			return null;
		}

		const baseUrl: string = config.get('Hyperliquid.Network.host');
		const isTestnet = baseUrl.includes('testnet');

		const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY.startsWith('0x')
			? process.env.HYPERLIQUID_PRIVATE_KEY
			: '0x' + process.env.HYPERLIQUID_PRIVATE_KEY;

		const wallet = new ethers.Wallet(privateKey);
		const transport = new HttpTransport({
			apiUrl: baseUrl,
			isTestnet
		});
		const info = new InfoClient({ transport });
		const exchange = new ExchangeClient({ transport, wallet });

		return new HyperliquidHelper(info, exchange, wallet.address);
	}
}

export class HyperliquidClient extends AbstractDexClient {
	private referrerAttempted = false;

	async getIsAccountReady(): Promise<boolean> {
		try {
			const helper = HyperliquidHelper.build();
			if (!helper) return false;

			console.log('Hyperliquid wallet address:', helper.address);

			const userAddr = helper.address as `0x${string}`;

			// Check perps margin account
			const accountState = await helper.info.clearinghouseState({
				user: userAddr
			});
			const perpsValue = parseFloat(accountState.marginSummary.accountValue);

			// Check spot balances (deposits land here)
			const spotState = await helper.info.spotClearinghouseState({
				user: userAddr
			});
			const spotValue = (spotState.balances || []).reduce(
				(sum: number, b: any) => sum + parseFloat(b.total || '0'),
				0
			);

			const totalValue = perpsValue + spotValue;
			console.log(
				'Hyperliquid account — perps:',
				perpsValue,
				'spot:',
				spotValue,
				'total:',
				totalValue
			);

			return totalValue > 0;
		} catch (error) {
			console.error(error);
			return false;
		}
	}

	async placeOrder(alertMessage: AlertObject) {
		const orderParams = await this.buildOrderParams(alertMessage);
		if (!orderParams) return;

		const orderResult = await this.createOrder(orderParams);
		if (!orderResult) return;

		await this.writeTradeHistory(
			alertMessage.strategy,
			orderResult,
			alertMessage.price,
			alertMessage.market,
			alertMessage.order
		);

		return orderResult;
	}

	async buildOrderParams(alertMessage: AlertObject) {
		console.log('buildOrderParams input:', JSON.stringify(alertMessage));

		const helper = HyperliquidHelper.build();
		if (!helper) return;

		const [, rootData] = getStrategiesDB();

		// Coerce numeric fields that may arrive as strings from JSON body
		if (alertMessage.size != null)
			alertMessage.size = Number(alertMessage.size);
		if (alertMessage.sizeUsd != null)
			alertMessage.sizeUsd = Number(alertMessage.sizeUsd);
		if (alertMessage.sizeByLeverage != null)
			alertMessage.sizeByLeverage = Number(alertMessage.sizeByLeverage);
		if (alertMessage.price != null)
			alertMessage.price = Number(alertMessage.price);

		// Normalize market name and detect HIP-3 builder-deployed perps
		const marketUpper = alertMessage.market.toUpperCase();
		const isHip3 = marketUpper.includes(':');
		let coin: string;
		let dexName: string | undefined;

		if (isHip3) {
			const [dex, symbol] = marketUpper.split(':');
			dexName = dex.toLowerCase();
			coin = `${dexName}:${symbol}`;
		} else {
			coin = marketUpper.split(/[-_]/)[0];
		}

		const isBuy = alertMessage.order === 'buy';

		// Get market metadata for asset index and size decimals
		const dexParam = dexName ? { dex: dexName } : undefined;
		const meta = await helper.info.meta(dexParam);
		const assetInfo = meta.universe.find((a: any) => a.name === coin);
		if (!assetInfo) {
			console.error(`Asset ${coin} not found on Hyperliquid`);
			return;
		}
		const indexInMeta = meta.universe.indexOf(assetInfo);
		const szDecimals: number = assetInfo.szDecimals;

		// Compute asset index (HIP-3 uses formula: 100000 + dexIndex * 10000 + indexInMeta)
		let assetIndex: number;
		if (dexName) {
			const perpDexes = await helper.info.perpDexs();
			const dexIndex = perpDexes.findIndex((d: any) => d?.name === dexName);
			if (dexIndex < 0) {
				console.error(`DEX "${dexName}" not found on Hyperliquid`);
				return;
			}
			assetIndex = 100000 + dexIndex * 10000 + indexInMeta;
		} else {
			assetIndex = indexInMeta;
		}

		// Get mid price for size calculation and slippage
		const mids = await helper.info.allMids(dexParam);
		const midPrice = parseFloat(mids[coin]);
		if (!midPrice) {
			console.error(`Could not get mid price for ${coin} on Hyperliquid`);
			return;
		}

		// Determine order size
		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const userAddr = helper.address as `0x${string}`;
			const accountState = await helper.info.clearinghouseState({
				user: userAddr
			});
			const perpsValue = parseFloat(accountState.marginSummary.accountValue);
			const spotState = await helper.info.spotClearinghouseState({
				user: userAddr
			});
			const spotValue = (spotState.balances || []).reduce(
				(sum: number, b: any) => sum + parseFloat(b.total || '0'),
				0
			);
			const equity = perpsValue + spotValue;
			orderSize = (equity * Number(alertMessage.sizeByLeverage)) / midPrice;
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / midPrice;
		} else if (
			alertMessage.reverse &&
			rootData[alertMessage.strategy] &&
			rootData[alertMessage.strategy].isFirstOrder === 'false'
		) {
			orderSize = alertMessage.size * 2;
		} else {
			orderSize = alertMessage.size;
		}

		const sizeStr = orderSize.toFixed(szDecimals);

		// Apply slippage for IOC market-like order
		const slippage: number = config.get('Hyperliquid.User.slippage');
		const limitPrice = isBuy
			? midPrice * (1 + slippage)
			: midPrice * (1 - slippage);

		// Format price with 5 significant figures
		const priceStr = parseFloat(limitPrice.toPrecision(5)).toString();

		const orderParams: hyperliquidOrderParams = {
			coin,
			isBuy,
			size: sizeStr,
			price: priceStr,
			reduceOnly: false,
			assetIndex
		};

		console.log('orderParams for Hyperliquid', orderParams);
		return orderParams;
	}

	private async createOrder(orderParams: hyperliquidOrderParams) {
		let count = 0;
		const maxTries = 3;
		while (count <= maxTries) {
			try {
				const helper = HyperliquidHelper.build();
				if (!helper) return;

				// Attempt to set referrer on first order
				if (!this.referrerAttempted) {
					this.referrerAttempted = true;
					try {
						const referralState = await helper.info.referral({
							user: helper.address as `0x${string}`
						});
						if (!referralState.referredBy) {
							await helper.exchange.setReferrer({
								code: REFERRAL_CODE
							});
						}
					} catch (error) {
						console.log('Hyperliquid referrer check/set failed:', error);
					}
				}

				// Build builder fee
				const builderFee: number = config.get('Hyperliquid.User.builderFee');
				const builder = {
					b: BUILDER_ADDRESS,
					f: builderFee
				};

				const orderRequest: any = {
					orders: [
						{
							a: orderParams.assetIndex,
							b: orderParams.isBuy,
							p: orderParams.price,
							s: orderParams.size,
							r: orderParams.reduceOnly,
							t: { limit: { tif: 'Ioc' as const } }
						}
					],
					grouping: 'na' as const
				};

				if (builderFee > 0) {
					orderRequest.builder = builder;
				}

				console.log('Hyperliquid orderRequest:', JSON.stringify(orderRequest));

				const result = await helper.exchange.order(orderRequest);

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
				console.log('Hyperliquid order result:', JSON.stringify(result));

				return result;
			} catch (error) {
				count++;
				console.error(
					`Hyperliquid order attempt ${count}/${maxTries} failed:`,
					error
				);
				if (count >= maxTries) break;
				await _sleep(5000);
			}
		}
	}

	private async writeTradeHistory(
		strategy: string,
		orderResult: any,
		tradingviewPrice: number,
		market: string,
		orderSide: string
	) {
		const [db, rootData] = getStrategiesDB();
		const rootPath = '/' + strategy;
		const isFirstOrderPath = rootPath + '/isFirstOrder';
		db.push(isFirstOrderPath, 'false');

		// Extract fill data from Hyperliquid response
		const statuses = orderResult.response?.data?.statuses || [];
		const fillData = statuses[0]?.filled || {};

		const totalSz = fillData.totalSz || '0';
		const avgPx = fillData.avgPx || '0';
		const oid = fillData.oid || '';
		const orderSize = parseFloat(totalSz);

		const side = orderSide == 'buy' ? 'BUY' : 'SELL';

		// Store position data
		const positionPath = rootPath + '/position';
		const position = side == 'BUY' ? orderSize : -1 * orderSize;
		const storedSize = rootData[strategy]?.position
			? rootData[strategy].position
			: 0;

		db.push(positionPath, storedSize + position);

		const environment =
			config.util.getEnv('NODE_ENV') == 'production' ? 'mainnet' : 'testnet';
		const folderPath = './data/exports/' + environment;
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath, { recursive: true });
		}

		const fullPath = folderPath + '/tradeHistoryHyperliquid.csv';
		if (!fs.existsSync(fullPath)) {
			const headerString =
				'datetime,strategy,market,side,size,avgPrice,tradingviewPrice,priceGap,status,orderId';
			fs.writeFileSync(fullPath, headerString);
		}

		const priceGap = parseFloat(avgPx) - tradingviewPrice;
		const status = statuses[0]?.filled ? 'FILLED' : 'FAILED';
		const date = new Date();

		const appendArray = [
			date.toISOString(),
			strategy,
			market,
			side,
			orderSize,
			avgPx,
			tradingviewPrice,
			priceGap,
			status,
			oid
		];
		const appendString = '\r\n' + appendArray.join();

		fs.appendFileSync(fullPath, appendString);
	}
}
