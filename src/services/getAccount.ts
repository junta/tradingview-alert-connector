import DYDXConnector from './client';
import { AccountResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');

const getAccount = async () => {
	console.log(config.get('User.ethAddress'));
	try {
		const connector = new DYDXConnector();
		const account: { account: AccountResponseObject } =
			await connector.client.private.getAccount(config.get('User.ethAddress'));

		return account;
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export default getAccount;
