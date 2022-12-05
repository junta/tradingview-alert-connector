import { DydxClient, AccountResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');
import 'dotenv/config';

class DYDXConnector {
	client: DydxClient;
	positionID = '0';

	public constructor() {
		if (
			!process.env.API_KEY ||
			!process.env.API_PASSPHRASE ||
			!process.env.API_PASSPHRASE
		) {
			throw new Error('API Key is not set in config file');
		}
		if (!process.env.STARK_PUBLIC_KEY || !process.env.STARK_PRIVATE_KEY) {
			throw new Error('STARK Key is not set in config file');
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
		if (!process.env.ETH_ADDRESS) {
			throw new Error('ethAddress is not set in config file');
		}

		const connector = new DYDXConnector();
		const account: { account: AccountResponseObject } =
			await connector.client.private.getAccount(process.env.ETH_ADDRESS);

		connector.positionID = account.account.positionId;

		// console.log(
		// 	'initialized. ethAddress:',
		// 	ethAddress,
		// 	'positionID:',
		// 	connector.positionID
		// );

		return connector;
	}
}

export default DYDXConnector;
