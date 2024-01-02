import { ethers } from 'ethers';
import config = require('config');
import 'dotenv/config';

export const getGmxClient = () => {
	if (!process.env.GMX_PRIVATE_KEY) {
		console.log('GMX_PRIVATE_KEY for GMX is not set as environment variable');
		return;
	}

	const rpcUrl: string = config.get('GMX.Network.host');
	const provider = ethers.getDefaultProvider(rpcUrl);
	return new ethers.Wallet(process.env.GMX_PRIVATE_KEY, provider);
};
