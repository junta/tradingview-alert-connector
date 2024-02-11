import {
	CompositeClient,
	Network,
	BECH32_PREFIX,
	LocalWallet,
	OrderExecution,
	OrderTimeInForce,
	OrderType,
	SubaccountClient,
	IndexerConfig,
	ValidatorConfig
} from '@dydxprotocol/v4-client-js';
import { deriveHDKeyFromEthereumSignature } from '@dydxprotocol/v4-client-js/build/src/lib/onboarding';
import config = require('config');
import 'dotenv/config';
import { ethers } from 'ethers';
import { dydxV4OrderParams } from '../../types';

export const dydxV4CreateOrder = async (orderParams: dydxV4OrderParams) => {
	const indexerConfig = new IndexerConfig(
		'https://indexer.dydx.trade/',
		'wss://indexer.dydx.trade/v4/ws'
	);
	const validatorConfig = new ValidatorConfig(
		'https://dydx-mainnet-full-rpc.public.blastapi.io/',
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
	const network = new Network('mainnet', indexerConfig, validatorConfig);
	const client = await CompositeClient.connect(network);

	const mnemonic = process.env.DYDX_V4_MNEMONIC;
	const wallet = ethers.Wallet.fromMnemonic(mnemonic);

	// testnet
	// const chainId = 11155111;

	const toSign = {
		domain: {
			name: 'dYdX Chain',
			chainId: 1
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
	console.log('Signed Data:', signature);
	const k = deriveHDKeyFromEthereumSignature(signature);

	const lw = await LocalWallet.fromMnemonic(k.mnemonic, BECH32_PREFIX);
	console.log('Address:', lw.address);

	const subaccount = new SubaccountClient(lw, 0);
	const clientId = generateRandomInt32();
	const market = orderParams.market;
	const type = OrderType.MARKET;
	const side = orderParams.side;
	const timeInForce = OrderTimeInForce.FOK;
	const execution = OrderExecution.DEFAULT;
	const price = orderParams.price;
	const size = orderParams.size; // subticks are calculated by the price of the order
	const postOnly = false;
	const reduceOnly = false;
	const triggerPrice = null;

	try {
		const tx = await client.placeOrder(
			subaccount,
			market,
			type,
			side,
			price,
			size,
			clientId,
			timeInForce,
			10000,
			execution,
			postOnly,
			reduceOnly,
			triggerPrice
		);
		console.log(tx);
		return {
			side: orderParams.side,
			size: orderParams.size,
			price: orderParams.price,
			market: orderParams.market,
			clientId: clientId
		};
	} catch (e) {
		console.error(e);
	}
};

function generateRandomInt32(): number {
	const maxInt32 = 2147483647;
	return Math.floor(Math.random() * (maxInt32 + 1));
}
