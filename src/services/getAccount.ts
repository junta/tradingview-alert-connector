import DYDXConnector from './client';
import { AccountResponseObject } from '@dydxprotocol/v3-client';
import config = require('config');
import 'dotenv/config';

export const getAccount = async () => {
	try {
		const connector = await DYDXConnector.build();
		const account: { account: AccountResponseObject } =
			await connector.client.private.getAccount(process.env.ETH_ADDRESS);

		if (Number(account.account.freeCollateral) == 0) {
			throw new Error('No freeCollateral. Deposit collateral first.');
		}
		return account;
	} catch (error) {
		console.error(error);
	}
};
