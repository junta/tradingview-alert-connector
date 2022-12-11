import { DydxClient } from '@dydxprotocol/v3-client';
import config = require('config');
import 'dotenv/config';

class DYDXConnector {
	client: DydxClient | undefined;
	positionID = '0';
	static instance: DYDXConnector | null = null;

	public constructor() {
		if (
			!process.env.API_KEY ||
			!process.env.API_PASSPHRASE ||
			!process.env.API_PASSPHRASE
		) {
			console.log('API Key for dYdX is not set as environment variable');
			return;
		}
		if (!process.env.STARK_PUBLIC_KEY || !process.env.STARK_PRIVATE_KEY) {
			console.log('STARK Key for dYdX is not set as environment variable');
			return;
		}

		const apiKeys = {
			key: process.env.API_KEY,
			passphrase: process.env.API_PASSPHRASE,
			secret: process.env.API_SECRET
		};

		const starkKeyPair = {
			publicKey: process.env.STARK_PUBLIC_KEY,
			privateKey: process.env.STARK_PRIVATE_KEY
		};

		this.client = new DydxClient(config.get('Dydx.Network.host'), {
			apiTimeout: 3000,
			networkId: config.get('Dydx.Network.chainID'),
			apiKeyCredentials: apiKeys,
			starkPrivateKey: starkKeyPair
		});
	}

	static async build() {
		if (!this.instance) {
			const connector = new DYDXConnector();
			if (!connector || !connector.client) return;
			const account = await connector.client.private.getAccount(
				process.env.ETH_ADDRESS
			);

			connector.positionID = account.account.positionId;
			this.instance = connector;
		}

		return this.instance;
	}
}

export default DYDXConnector;
