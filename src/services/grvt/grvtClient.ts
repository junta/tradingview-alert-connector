import { AbstractDexClient } from '../abstractDexClient';
import { AlertObject, OrderResult } from '../../types';
import { _sleep, doubleSizeIfReverseOrder } from '../../helper';
import config = require('config');
import 'dotenv/config';

import { signTyped, addr as ethAddr } from 'micro-eth-signer';

// ── GRVT environment config ───────────────────────────────────

const ENVS: Record<string, { chainId: number; edge: string; trades: string; marketData: string }> = {
	mainnet: {
		chainId: 325,
		edge: 'https://edge.grvt.io',
		trades: 'https://trades.grvt.io',
		marketData: 'https://market-data.grvt.io',
	},
	testnet: {
		chainId: 326,
		edge: 'https://edge.testnet.grvt.io',
		trades: 'https://trades.testnet.grvt.io',
		marketData: 'https://market-data.testnet.grvt.io',
	},
};

// ── EIP-712 constants ─────────────────────────────────────────

const TIF_IOC = 3;

const EIP712_ORDER_TYPES = {
	Order: [
		{ name: 'subAccountID', type: 'uint64' },
		{ name: 'isMarket', type: 'bool' },
		{ name: 'timeInForce', type: 'uint8' },
		{ name: 'postOnly', type: 'bool' },
		{ name: 'reduceOnly', type: 'bool' },
		{ name: 'legs', type: 'OrderLeg[]' },
		{ name: 'nonce', type: 'uint32' },
		{ name: 'expiration', type: 'int64' },
	],
	OrderLeg: [
		{ name: 'assetID', type: 'uint256' },
		{ name: 'contractSize', type: 'uint64' },
		{ name: 'limitPrice', type: 'uint64' },
		{ name: 'isBuyingContract', type: 'bool' },
	],
};

// ── Helpers ───────────────────────────────────────────────────

function generateNonce(): number {
	return Math.floor(Math.random() * 1e9);
}

function generateExpiration(durationMs = 30 * 24 * 60 * 60 * 1000): string {
	const expirationMs = Date.now() + durationMs;
	return (BigInt(expirationMs) * BigInt(1_000_000)).toString();
}

function generateClientOrderId(): string {
	const min = BigInt(2) ** BigInt(63);
	const range = BigInt(2) ** BigInt(63);
	return (min + BigInt(Math.floor(Math.random() * Number(range)))).toString();
}

function padHex(hex: string): string {
	const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
	return `0x${raw.padStart(64, '0')}`;
}

function roundDown(value: number, tickSize: number): number {
	return Math.floor(value / tickSize) * tickSize;
}

// ── GRVT direct API helper ────────────────────────────────────

class GrvtApi {
	readonly privateKey: string;
	readonly signerAddress: string;
	readonly apiKey: string;
	readonly subAccountId: string;
	readonly envConfig: typeof ENVS[string];
	private cookie: string | null = null;

	constructor(privateKey: string, apiKey: string, subAccountId: string, env: string) {
		this.privateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
		this.signerAddress = ethAddr.fromSecretKey(this.privateKey);
		this.apiKey = apiKey;
		this.subAccountId = subAccountId;
		this.envConfig = ENVS[env] || ENVS.mainnet;
		console.log('GRVT signer address:', this.signerAddress);
		console.log('GRVT env:', env, 'chainId:', this.envConfig.chainId);
	}

	static build(): GrvtApi | null {
		if (!process.env.GRVT_API_KEY) {
			console.log('GRVT_API_KEY is not set as environment variable');
			return null;
		}
		if (!process.env.GRVT_PRIVATE_KEY) {
			console.log('GRVT_PRIVATE_KEY is not set as environment variable');
			return null;
		}
		if (!process.env.GRVT_TRADING_ACCOUNT_ID) {
			console.log('GRVT_TRADING_ACCOUNT_ID is not set as environment variable');
			return null;
		}
		const env: string = config.get('Grvt.Network.env');
		return new GrvtApi(
			process.env.GRVT_PRIVATE_KEY,
			process.env.GRVT_API_KEY,
			process.env.GRVT_TRADING_ACCOUNT_ID,
			env
		);
	}

	// ── Auth ──

	private async ensureCookie(): Promise<string> {
		if (this.cookie) return this.cookie;

		const url = `${this.envConfig.edge}/auth/api_key/login`;
		console.log('GRVT: logging in via', url);
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ api_key: this.apiKey }),
		});
		if (!resp.ok) {
			const body = await resp.text().catch(() => '');
			throw new Error(`GRVT login failed: ${resp.status} ${body}`);
		}
		const setCookie = resp.headers.get('set-cookie') || '';
		const m = setCookie.match(/gravity=([^;]+)/);
		if (!m) throw new Error('GRVT login: no gravity cookie in response');
		this.cookie = m[1];
		console.log('GRVT: authenticated successfully');
		return this.cookie;
	}

	// ── Generic API calls ──

	async marketDataPost(path: string, body: any): Promise<any> {
		const url = `${this.envConfig.marketData}/${path}`;
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		if (!resp.ok) {
			const text = await resp.text().catch(() => '');
			throw new Error(`GRVT ${path}: ${resp.status} ${text}`);
		}
		return resp.json();
	}

	async tradingPost(path: string, body: any): Promise<any> {
		const cookie = await this.ensureCookie();
		const url = `${this.envConfig.trades}/${path}`;
		console.log('GRVT POST', url);
		const resp = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cookie': `gravity=${cookie}`,
			},
			body: JSON.stringify(body),
		});
		const text = await resp.text();
		console.log('GRVT response:', resp.status, text);
		if (!resp.ok) {
			throw new Error(`GRVT ${path}: ${resp.status} ${text}`);
		}
		return JSON.parse(text);
	}

	// ── Convenience wrappers ──

	async getTicker(instrument: string) {
		return this.marketDataPost('full/v1/ticker', { instrument });
	}

	async getInstrument(instrument: string) {
		return this.marketDataPost('full/v1/instrument', { instrument });
	}

	async getSubAccountSummary() {
		return this.tradingPost('full/v1/account_summary', {
			sub_account_id: this.subAccountId,
		});
	}

	// ── Order signing (direct EIP-712 via micro-eth-signer) ──

	signOrder(params: {
		instrumentHash: string;
		baseDecimals: number;
		size: number;
		isBuy: boolean;
		nonce: number;
		expiration: string;
	}) {
		// 3-field domain matching GRVT official Python SDK — no verifyingContract
		const domain = {
			name: 'GRVT Exchange',
			version: '0',
			chainId: this.envConfig.chainId,
		};

		const sizeMultiplier = BigInt(10 ** params.baseDecimals);
		const contractSize = BigInt(Math.round(params.size * Number(sizeMultiplier)));
		const limitPriceBig = BigInt(0);

		const message = {
			subAccountID: BigInt(this.subAccountId),
			isMarket: true,
			timeInForce: TIF_IOC,
			postOnly: false,
			reduceOnly: false,
			legs: [
				{
					assetID: params.instrumentHash,
					contractSize,
					limitPrice: limitPriceBig,
					isBuyingContract: params.isBuy,
				}
			],
			nonce: params.nonce,
			expiration: BigInt(params.expiration),
		};

		console.log('GRVT EIP-712 domain:', JSON.stringify(domain));
		console.log('GRVT EIP-712 message:', JSON.stringify(message, (_k, v) =>
			typeof v === 'bigint' ? v.toString() : v
		));

		// Sign directly with micro-eth-signer — no SDK wrapper
		const sigHex: string = signTyped(
			{
				domain,
				types: EIP712_ORDER_TYPES,
				primaryType: 'Order',
				message,
			},
			this.privateKey,
			false // deterministic (RFC 6979)
		);

		// Parse 0x + r(64hex) + s(64hex) + v(2hex)
		const raw = sigHex.startsWith('0x') ? sigHex.slice(2) : sigHex;
		const r = padHex('0x' + raw.slice(0, 64));
		const s = padHex('0x' + raw.slice(64, 128));
		const v = parseInt(raw.slice(128, 130), 16);

		console.log('GRVT signature: r=%s s=%s v=%d signer=%s', r, s, v, this.signerAddress);
		return { r, s, v, signer: this.signerAddress.toLowerCase() };
	}
}

// ── DexClient implementation ──────────────────────────────────

export class GrvtDexClient extends AbstractDexClient {
	async getIsAccountReady(): Promise<boolean> {
		try {
			const api = GrvtApi.build();
			if (!api) return false;

			console.log('GRVT: checking account readiness...');
			const account = await api.getSubAccountSummary();
			console.log(
				'GRVT account connected,',
				'total_equity:', account.result.total_equity,
				'available_balance:', account.result.available_balance
			);
			return true;
		} catch (error) {
			console.error('GRVT account check failed:', error);
			return false;
		}
	}

	async placeOrder(alertMessage: AlertObject) {
		const api = GrvtApi.build();
		if (!api) return;

		const orderParams = await this.buildOrderParams(alertMessage, api);
		if (!orderParams) return;

		const orderResult = await this.createOrder(orderParams, api);
		if (!orderResult) return;

		await this.exportOrder(
			'Grvt',
			alertMessage.strategy,
			orderResult,
			alertMessage.price,
			alertMessage.market
		);

		return orderResult;
	}

	private async buildOrderParams(alertMessage: AlertObject, api: GrvtApi) {
		console.log('GRVT buildOrderParams input:', JSON.stringify(alertMessage));

		if (alertMessage.size != null)
			alertMessage.size = Number(alertMessage.size);
		if (alertMessage.sizeUsd != null)
			alertMessage.sizeUsd = Number(alertMessage.sizeUsd);
		if (alertMessage.sizeByLeverage != null)
			alertMessage.sizeByLeverage = Number(alertMessage.sizeByLeverage);
		if (alertMessage.price != null)
			alertMessage.price = Number(alertMessage.price);

		// Normalize market name: "AXS" or "AXS-USDT" -> "AXS_USDT_Perp"
		let market = alertMessage.market;
		if (!market.includes('_Perp')) {
			const base = market.split(/[-_]/)[0].toUpperCase();
			market = `${base}_USDT_Perp`;
		}
		console.log('GRVT normalized market:', market);

		const isBuy = alertMessage.order === 'buy';

		const ticker = await api.getTicker(market);
		const midPrice = parseFloat(ticker.result.mark_price);
		if (!midPrice) {
			console.error(`GRVT: Could not get price for ${market}`);
			return;
		}
		console.log('GRVT midPrice:', midPrice);

		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const account = await api.getSubAccountSummary();
			const equity = parseFloat(account.result.total_equity);
			if (!equity || equity <= 0) {
				console.error('GRVT: Could not determine account equity for sizeByLeverage');
				return;
			}
			orderSize = (equity * Number(alertMessage.sizeByLeverage)) / midPrice;
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / midPrice;
		} else {
			orderSize = alertMessage.size;
		}

		orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

		return { market, isBuy, size: orderSize };
	}

	private async createOrder(
		orderParams: { market: string; isBuy: boolean; size: number },
		api: GrvtApi
	) {
		let count = 0;
		const maxTries = 3;
		let orderPlaced = false;

		while (count < maxTries) {
			try {
				if (orderPlaced) {
					console.log('GRVT: Order was already placed, not retrying');
					return;
				}

				console.log(`GRVT: Placing order attempt ${count + 1}/${maxTries}`);

				// Fetch instrument metadata
				const instrumentResp = await api.getInstrument(orderParams.market);
				const instrument = instrumentResp.result;
				const baseDecimals = parseInt(String(instrument.base_decimals ?? '9'));
				const minSize = parseFloat(instrument.min_size || '1');
				console.log('GRVT instrument_hash:', instrument.instrument_hash,
					'base_decimals:', baseDecimals, 'min_size:', minSize);

				// Round size to min size step
				const orderSize = roundDown(orderParams.size, minSize);
				if (orderSize < minSize) {
					console.error(`GRVT: Order size ${orderParams.size} is below min_size ${minSize}`);
					return;
				}
				console.log('GRVT rounded orderSize:', orderSize);

				const nonce = generateNonce();
				const expiration = generateExpiration();

				// Sign directly with micro-eth-signer
				const sig = api.signOrder({
					instrumentHash: instrument.instrument_hash,
					baseDecimals,
					size: orderSize,
					isBuy: orderParams.isBuy,
					nonce,
					expiration,
				});

				// Determine decimal places from min_size for string formatting
				const sizeDecimals = Math.max(0, -Math.floor(Math.log10(minSize)));

				// Build payload — true market order
				const payload = {
					order: {
						sub_account_id: api.subAccountId,
						is_market: true,
						time_in_force: 'IMMEDIATE_OR_CANCEL',
						post_only: false,
						reduce_only: false,
						legs: [
							{
								instrument: orderParams.market,
								size: orderSize.toFixed(sizeDecimals),
								is_buying_asset: orderParams.isBuy,
							}
						],
						signature: {
							signer: sig.signer,
							r: sig.r,
							s: sig.s,
							v: sig.v,
							expiration: String(expiration),
							nonce,
						},
						metadata: {
							client_order_id: generateClientOrderId(),
						},
					},
				};
				console.log('GRVT createOrder payload:', JSON.stringify(payload));

				const result = await api.tradingPost('full/v1/create_order', payload);
				orderPlaced = true;

				console.log(
					new Date() + ' GRVT placed order:',
					'market:', orderParams.market,
					'side:', orderParams.isBuy ? 'BUY' : 'SELL',
					'size:', orderParams.size
				);
				console.log('GRVT order result:', JSON.stringify(result));

				const order = result.result;
				const legSize = order.legs?.[0]?.size;
				const remainingSize = order.state?.remaining_size;
				const filledSize =
					legSize && remainingSize
						? parseFloat(legSize) - parseFloat(remainingSize)
						: orderParams.size;

				const orderResult: OrderResult = {
					size: Number(filledSize),
					side: orderParams.isBuy ? 'BUY' : 'SELL',
					orderId: order.order_id || String(Date.now())
				};

				return orderResult;
			} catch (error) {
				if (orderPlaced) {
					console.error('GRVT: Error after order placement, not retrying:', error);
					return;
				}

				count++;
				console.error(`GRVT order attempt ${count}/${maxTries} failed:`, error);
				if (count >= maxTries) break;
				await _sleep(5000);
			}
		}
	}
}
