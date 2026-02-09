import { AbstractDexClient } from '../abstractDexClient';
import { AlertObject, hyperliquidOrderParams } from '../../types';
import { _sleep, getStrategiesDB } from '../../helper';
import { ethers } from 'ethers';
import * as https from 'https';
import * as msgpack from '@msgpack/msgpack';
import * as fs from 'fs';
import config = require('config');
import 'dotenv/config';

function httpPost(url: string, data: any): Promise<any> {
	return new Promise((resolve, reject) => {
		const urlObj = new URL(url);
		const postData = JSON.stringify(data);
		const options = {
			hostname: urlObj.hostname,
			port: 443,
			path: urlObj.pathname,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(postData)
			}
		};

		const req = https.request(options, (res) => {
			let body = '';
			res.on('data', (chunk: string) => (body += chunk));
			res.on('end', () => {
				try {
					resolve(JSON.parse(body));
				} catch {
					resolve(body);
				}
			});
		});

		req.on('error', reject);
		req.write(postData);
		req.end();
	});
}

const EIP_712_DOMAIN = {
	name: 'Exchange',
	version: '1',
	chainId: 1337,
	verifyingContract: '0x0000000000000000000000000000000000000000'
};

const AGENT_TYPES = {
	Agent: [
		{ name: 'source', type: 'string' },
		{ name: 'connectionId', type: 'bytes32' }
	]
};

export class HyperliquidConnector {
	private wallet: ethers.Wallet;
	private baseUrl: string;
	private isMainnet: boolean;
	private static referrerSet = false;

	constructor(wallet: ethers.Wallet, baseUrl: string, isMainnet: boolean) {
		this.wallet = wallet;
		this.baseUrl = baseUrl;
		this.isMainnet = isMainnet;
	}

	static build(): HyperliquidConnector | null {
		if (!process.env.HYPERLIQUID_PRIVATE_KEY) {
			console.log(
				'HYPERLIQUID_PRIVATE_KEY is not set as environment variable'
			);
			return null;
		}

		const baseUrl: string = config.get('Hyperliquid.Network.host');
		const isMainnet = baseUrl.includes('api.hyperliquid.xyz');

		const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY.startsWith('0x')
			? process.env.HYPERLIQUID_PRIVATE_KEY
			: '0x' + process.env.HYPERLIQUID_PRIVATE_KEY;

		const wallet = new ethers.Wallet(privateKey);

		return new HyperliquidConnector(wallet, baseUrl, isMainnet);
	}

	getAddress(): string {
		return this.wallet.address;
	}

	async info(body: any): Promise<any> {
		return httpPost(this.baseUrl + '/info', body);
	}

	async getMeta(): Promise<any> {
		return this.info({ type: 'meta' });
	}

	async getAllMids(): Promise<Record<string, string>> {
		return this.info({ type: 'allMids' });
	}

	async getAccountState(): Promise<any> {
		return this.info({
			type: 'clearinghouseState',
			user: this.wallet.address
		});
	}

	private computeActionHash(
		action: any,
		nonce: number,
		vaultAddress: string | null
	): string {
		const msgpackBytes = msgpack.encode(action);
		const nonceBytes = Buffer.alloc(8);
		nonceBytes.writeBigUInt64BE(BigInt(nonce));
		const vaultByte = Buffer.from([vaultAddress ? 1 : 0]);

		let data: Buffer;
		if (vaultAddress) {
			const vaultBytes = Buffer.from(
				vaultAddress.replace('0x', ''),
				'hex'
			);
			data = Buffer.concat([
				Buffer.from(msgpackBytes),
				nonceBytes,
				vaultByte,
				vaultBytes
			]);
		} else {
			data = Buffer.concat([
				Buffer.from(msgpackBytes),
				nonceBytes,
				vaultByte
			]);
		}

		return ethers.utils.keccak256(data);
	}

	private async signAction(
		action: any,
		nonce: number,
		vaultAddress: string | null = null
	): Promise<any> {
		const actionHash = this.computeActionHash(action, nonce, vaultAddress);

		const domain = {
			...EIP_712_DOMAIN,
			chainId: this.isMainnet ? 1337 : 421614
		};

		const agentValue = {
			source: this.isMainnet ? 'a' : 'b',
			connectionId: actionHash
		};

		const signature = await this.wallet._signTypedData(
			domain,
			AGENT_TYPES,
			agentValue
		);
		const { r, s, v } = ethers.utils.splitSignature(signature);

		return { r, s, v };
	}

	async exchange(action: any): Promise<any> {
		const nonce = Date.now();
		const signature = await this.signAction(action, nonce);

		const payload = {
			action,
			nonce,
			signature,
			vaultAddress: null
		};

		return httpPost(this.baseUrl + '/exchange', payload);
	}

	async setReferrer(code: string): Promise<any> {
		if (HyperliquidConnector.referrerSet) return;

		try {
			const action = {
				type: 'setReferrer',
				code
			};
			const result = await this.exchange(action);
			HyperliquidConnector.referrerSet = true;
			console.log('Hyperliquid referrer set to:', code);
			return result;
		} catch (error) {
			HyperliquidConnector.referrerSet = true;
			console.log('Hyperliquid referrer already set or failed:', error);
		}
	}

	async placeOrder(
		assetIndex: number,
		isBuy: boolean,
		limitPx: string,
		sz: string,
		reduceOnly: boolean = false,
		builder?: { b: string; f: number }
	): Promise<any> {
		const order: any = {
			a: assetIndex,
			b: isBuy,
			p: limitPx,
			s: sz,
			r: reduceOnly,
			t: { limit: { tif: 'Ioc' } }
		};

		const action: any = {
			type: 'order',
			orders: [order],
			grouping: 'na'
		};

		if (builder) {
			action.builder = builder;
		}

		return this.exchange(action);
	}
}

export class HyperliquidClient extends AbstractDexClient {
	private referrerAttempted = false;

	async getIsAccountReady(): Promise<boolean> {
		try {
			const connector = HyperliquidConnector.build();
			if (!connector) return false;

			const accountState = await connector.getAccountState();
			console.log('Hyperliquid accountState:', JSON.stringify(accountState, null, 2));
			const accountValue = parseFloat(
				accountState.marginSummary.accountValue
			);
			console.log('Hyperliquid account value:', accountValue);

			if (accountValue == 0) {
				return false;
			} else {
				return true;
			}
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
		const connector = HyperliquidConnector.build();
		if (!connector) return;

		const [, rootData] = getStrategiesDB();

		// Normalize market name: support "BTC-USD", "BTC-PERP", "BTC_USD", "BTC"
		const coin = alertMessage.market
			.replace(/-USD$/i, '')
			.replace(/-PERP$/i, '')
			.replace(/_USD$/i, '')
			.replace(/_PERP$/i, '')
			.toUpperCase();

		const isBuy = alertMessage.order === 'buy';

		// Get market metadata for asset index and size decimals
		const meta = await connector.getMeta();
		const assetInfo = meta.universe.find((a: any) => a.name === coin);
		if (!assetInfo) {
			console.error(`Asset ${coin} not found on Hyperliquid`);
			return;
		}
		const assetIndex = meta.universe.indexOf(assetInfo);
		const szDecimals: number = assetInfo.szDecimals;

		// Get mid price for size calculation and slippage
		const mids = await connector.getAllMids();
		const midPrice = parseFloat(mids[coin]);
		if (!midPrice) {
			console.error(
				`Could not get mid price for ${coin} on Hyperliquid`
			);
			return;
		}

		// Determine order size
		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const accountState = await connector.getAccountState();
			const equity = parseFloat(accountState.marginSummary.accountValue);
			orderSize =
				(equity * Number(alertMessage.sizeByLeverage)) / midPrice;
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
				const connector = HyperliquidConnector.build();
				if (!connector) return;

				// Attempt to set referrer on first order
				if (!this.referrerAttempted) {
					this.referrerAttempted = true;
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
			config.util.getEnv('NODE_ENV') == 'production'
				? 'mainnet'
				: 'testnet';
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
