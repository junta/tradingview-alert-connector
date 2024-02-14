import 'dotenv/config';
import { dydxV4Client, generateLocalWallet } from './client';
import {
	IndexerClient,
	IndexerConfig,
	Network
} from '@dydxprotocol/v4-client-js';
import config from 'config';

export const dydxV4GetAccount = async () => {
	const mainnetIndexerConfig = new IndexerConfig(
		config.get('DydxV4.IndexerConfig.httpsEndpoint'),
		config.get('DydxV4.IndexerConfig.wssEndpoint')
	);
	const indexerConfig =
		process.env.NODE_ENV !== 'production'
			? Network.testnet().indexerConfig
			: mainnetIndexerConfig;
	try {
		const client = new IndexerClient(indexerConfig);
		const localWallet = await generateLocalWallet();
		const response = await client.account.getSubaccount(localWallet.address, 0);

		console.log(
			'dydx v4 account: ' + JSON.stringify(response.subaccount, null, 2)
		);
		if (Number(response.subaccount.freeCollateral) > 0) {
			return { isReady: true, account: response.subaccount };
		} else {
			return { isReady: false, account: null };
		}
	} catch (error) {
		console.error(error);
	}
};
