import PerpetualConnector from './client';

export const perpGetAccount = async () => {
	try {
		const perp = await PerpetualConnector.build();
		if (!perp || !perp.wallet) return false;

		const account = await perp.wallet.getBalanceEth();
		console.log('Perpetual Protocol ETH balance: ', Number(account));

		if (Number(account) == 0) {
			return false;
		} else {
			return true;
		}
	} catch (error) {
		console.error(error);
	}
};
