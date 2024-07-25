import {
	BECH32_PREFIX,
	IndexerClient,
	IndexerConfig,
	LocalWallet,
	Network,
	PositionStatus
} from '@dydxprotocol/v4-client-js';
import config from 'config';

export interface MarketData {
	market: string;
	status: PositionStatus;
	side: string;
	size: string;
	maxSize: string;
	entryPrice: string;
	exitPrice: string | null;
	realizedPnl: string;
	unrealizedPnl: string;
	createdAt: string;
	createdAtHeight: string;
	closedAt: string | null;
	sumOpen: string;
	sumClose: string;
	netFunding: string;
	subaccountNumber: number;
}

export interface PositionData {
	positions: MarketData[];
}

const buildIndexerClient = () => {
	const mainnetIndexerConfig = getIndexerConfig();
	const indexerConfig =
		process.env.NODE_ENV !== 'production'
			? Network.testnet().indexerConfig
			: mainnetIndexerConfig;
	return new IndexerClient(indexerConfig);
};

const getIndexerConfig = () => {
	return new IndexerConfig(
		config.get('DydxV4.IndexerConfig.httpsEndpoint'),
		config.get('DydxV4.IndexerConfig.wssEndpoint')
	);
};

const generateLocalWallet = async () => {
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

export const getOpenedPositions = async () => {
	const client = buildIndexerClient();
	const localWallet = await generateLocalWallet();
	if (!localWallet) return;
	console.log('update');

	return (await client.account.getSubaccountPerpetualPositions(
		localWallet.address,
		0,
		PositionStatus.OPEN
	)) as PositionData;
};
