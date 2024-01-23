import { ethers } from 'ethers';
import config = require('config');
import 'dotenv/config';

export const getGmxClient = () => {
	if (!process.env.GMX_PRIVATE_KEY) {
		console.error('GMX_PRIVATE_KEY for GMX is not set as environment variable');
		return;
	}

	if (!process.env.GMX_LEVERAGE) {
		console.error('GMX_LEVERAGE for GMX is not set as environment variable');
		return;
	}

	const GMX_LEVERAGE = Number(process.env.GMX_LEVERAGE);

	if (GMX_LEVERAGE < 1.1 || GMX_LEVERAGE > 50) {
		console.error('GMX_LEVERAGE must be between 1.1 and 50');
		return;
	}

	const rpcUrl: string = config.get('GMX.Network.host');
	const provider = ethers.getDefaultProvider(rpcUrl);
	return new ethers.Wallet(process.env.GMX_PRIVATE_KEY, provider);
};
