import { DydxClient, AccountResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');

class DYDXConnector {
	client: DydxClient;
	positionID = '0';

	public constructor() {
		const apiKey: string = config.get('User.apiKey');
		const apiPassphrase: string = config.get('User.apiPassphrase');
		const apiSecret: string = config.get('User.apiSecret');
		if (!apiKey || !apiPassphrase || !apiSecret) {
			throw new Error('API Key is not set in config file');
		}
		const publicKey: string = config.get('User.starkPublicKey');
		const privateKey: string = config.get('User.starkPrivateKey');
		if (!publicKey || !privateKey) {
			throw new Error('STARK Key is not set in config file');
		}

		const apiKeys = {
			key: apiKey,
			passphrase: apiPassphrase,
			secret: apiSecret
		};

		const starkKeyPair = {
			publicKey: publicKey,
			privateKey: privateKey
		};

		this.client = new DydxClient(config.get('Network.host'), {
			apiTimeout: 3000,
			networkId: config.get('Network.chainID'),
			apiKeyCredentials: apiKeys,
			starkPrivateKey: starkKeyPair
		});
	}

	static async build() {
		const ethAddress: string = config.get('User.ethAddress');
		if (!ethAddress) {
			throw new Error('ethAddress is not set in config file');
		}

		const connector = new DYDXConnector();
		const account: { account: AccountResponseObject } =
			await connector.client.private.getAccount(ethAddress);

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
