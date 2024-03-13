import { ethers } from 'ethers';
import { getGmxClient } from './client';

export const gmxGetAccount = async () => {
	try {
		const signer = getGmxClient();
		if (!signer) return false;
		const balance = await signer.getBalance();
		console.log(
			'GMX(Arbitrum) ETH balance: ',
			ethers.utils.formatEther(balance)
		);

		console.log('GMX_LEVERAGE: ' + process.env.GMX_LEVERAGE);

		return Number(balance) != 0;
	} catch (error) {
		console.error(error);
	}
};
