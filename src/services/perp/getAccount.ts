import PerpetualConnector from './client';

export const perpGetAccount = async () => {
	try {
		const perp = await PerpetualConnector.build();
		if (!perp || !perp.wallet) return false;

		const balance = await perp.wallet.getBalanceEth();
		console.log('Perpetual Protocol(Optimism) ETH balance: ', Number(balance));

		return Number(balance) != 0;
	} catch (error) {
		console.error(error);
	}
};
