import 'dotenv/config';
import { dydxV4IndexerClient, generateLocalWallet } from './client';

export const dydxV4GetAccount = async () => {
	try {
		const client = dydxV4IndexerClient();
		const localWallet = await generateLocalWallet();
		if (!localWallet) return;
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
		console.log(error);
	}
};
