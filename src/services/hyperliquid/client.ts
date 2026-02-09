import { ethers } from 'ethers';
import * as https from 'https';
import * as msgpack from '@msgpack/msgpack';
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

class HyperliquidConnector {
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
			// Referrer may already be set; ignore and mark as done
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

export default HyperliquidConnector;
