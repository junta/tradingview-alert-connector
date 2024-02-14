import {
	BECH32_PREFIX,
	CompositeClient,
	IndexerConfig,
	LocalWallet,
	Network,
	SubaccountClient,
	ValidatorConfig
} from '@dydxprotocol/v4-client-js';
import { deriveHDKeyFromEthereumSignature } from '@dydxprotocol/v4-client-js/build/src/lib/onboarding';
import config from 'config';
import { ethers } from 'ethers';

export const dydxV4Client = async () => {
	const indexerConfig = new IndexerConfig(
		config.get('DydxV4.IndexerConfig.httpsEndpoint'),
		config.get('DydxV4.IndexerConfig.wssEndpoint')
	);
	const validatorConfig = new ValidatorConfig(
		config.get('DydxV4.ValidatorConfig.restEndpoint'),
		'dydx-mainnet-1',
		{
			CHAINTOKEN_DENOM: 'adv4tnt',
			USDC_DENOM:
				'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
			USDC_GAS_DENOM: 'uusdc',
			USDC_DECIMALS: 6,
			CHAINTOKEN_DECIMALS: 18
		},
		undefined,
		'Client Example'
	);
	const network =
		process.env.NODE_ENV == 'production'
			? new Network('mainnet', indexerConfig, validatorConfig)
			: Network.testnet();
	const client = await CompositeClient.connect(network);

	const localWallet = await generateLocalWallet();
	const subaccount = new SubaccountClient(localWallet, 0);
	return { client, subaccount };
};

export const generateLocalWallet = async () => {
	if (!process.env.DYDX_V4_MNEMONIC) {
		console.log('DYDX_V4_MNEMONIC is not set as environment variable');
		return;
	}
	const mnemonic = process.env.DYDX_V4_MNEMONIC;
	const wallet = ethers.Wallet.fromMnemonic(mnemonic);

	const name = process.env.NODE_ENV == 'production' ? 'dYdX Chain' : 'dYdX V4';
	const chainId = process.env.NODE_ENV == 'production' ? 1 : 11155111;

	const toSign = {
		domain: {
			name: name,
			chainId: chainId
		},
		primaryType: 'dYdX',
		types: {
			EIP712Domain: [
				{
					name: 'name',
					type: 'string'
				},
				{
					name: 'chainId',
					type: 'uint256'
				}
			],
			dYdX: [
				{
					name: 'action',
					type: 'string'
				}
			]
		},
		message: {
			action: 'dYdX Chain Onboarding'
		}
	};

	const signature = await wallet._signTypedData(
		toSign.domain,
		{ dYdX: toSign.types.dYdX },
		toSign.message
	);
	const k = deriveHDKeyFromEthereumSignature(signature);

	const localWallet = await LocalWallet.fromMnemonic(k.mnemonic, BECH32_PREFIX);
	console.log('Address:', localWallet.address);

	return localWallet;
};
