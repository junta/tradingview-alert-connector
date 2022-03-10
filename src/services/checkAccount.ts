import DYDXConnector from './client';
import { AccountResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');

export const checkAccount = async () => {
	try {
		const connector = await DYDXConnector.build();
		const account: { account: AccountResponseObject } =
			await connector.client.private.getAccount(config.get('User.ethAddress'));

		return account;
	} catch (error) {
		console.log(error);
		throw error;
	}
};
