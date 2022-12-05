import PerpetualConnector from './client';
import { PerpetualProtocol } from '@perp/sdk-curie';

export const perpGetAccount = async () => {
	try {
		const perp: PerpetualProtocol = await PerpetualConnector.build();
		if (!perp.wallet) return;

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
