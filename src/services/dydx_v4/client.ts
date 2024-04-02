import {
	BECH32_PREFIX,
	CompositeClient,
	IndexerClient,
	IndexerConfig,
	LocalWallet,
	Network,
	SubaccountClient,
	ValidatorConfig
} from '@dydxprotocol/v4-client-js';
import config from 'config';

export const dydxV4Client = async () => {
	const validatorConfig = new ValidatorConfig(
		config.get('DydxV4.ValidatorConfig.restEndpoint'),
		'dydx-mainnet-1',
		{
			CHAINTOKEN_DENOM: 'adydx',
			CHAINTOKEN_DECIMALS: 18,
			USDC_DENOM:
				'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
			USDC_GAS_DENOM: 'uusdc',
			USDC_DECIMALS: 6
		}
	);
	const network =
		process.env.NODE_ENV == 'production'
			? new Network('mainnet', getIndexerConfig(), validatorConfig)
			: Network.testnet();
	let client;
	try {
		client = await CompositeClient.connect(network);
	} catch (e) {
		console.error(e);
		throw new Error('Failed to connect to dYdX v4 client');
	}

	const localWallet = await generateLocalWallet();
	const subaccount = new SubaccountClient(localWallet, 0);
	return { client, subaccount };
};

export const generateLocalWallet = async () => {
	if (!process.env.DYDX_V4_MNEMONIC) {
		console.log('DYDX_V4_MNEMONIC is not set as environment variable');
		return;
	}

	const localWallet = await LocalWallet.fromMnemonic(
		process.env.DYDX_V4_MNEMONIC,
		BECH32_PREFIX
	);
	console.log('dYdX v4 Address:', localWallet.address);

	return localWallet;
};

export const dydxV4IndexerClient = () => {
	const mainnetIndexerConfig = getIndexerConfig();
	const indexerConfig =
		process.env.NODE_ENV !== 'production'
			? Network.testnet().indexerConfig
			: mainnetIndexerConfig;
	return new IndexerClient(indexerConfig);
};

export const getIndexerConfig = () => {
	return new IndexerConfig(
		config.get('DydxV4.IndexerConfig.httpsEndpoint'),
		config.get('DydxV4.IndexerConfig.wssEndpoint')
	);
};
