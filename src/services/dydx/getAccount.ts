import DYDXConnector from './client';
import 'dotenv/config';

export const dydxGetAccount = async () => {
	try {
		const connector = await DYDXConnector.build();
		if(!connector) return false;
		
		const account = await connector.client.private.getAccount(
			process.env.ETH_ADDRESS
		);
		console.log('dYdX account: ', account);
		if (Number(account.account.freeCollateral) == 0) {
			return false;
		} else {
			return true;
		}
	} catch (error) {
		console.error(error);
	}
};
