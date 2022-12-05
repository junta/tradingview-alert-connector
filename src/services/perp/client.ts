import { PerpetualProtocol, SupportedChainIds } from '@perp/sdk-curie';
import config = require('config');
import 'dotenv/config';
import { ethers } from 'ethers';

class PerpetualConnector {
	static async build() {
		if (!process.env.ETH_PRIVATE_KEY) {
			throw new Error('ETH_PRIVATE_KEY is not set in config file');
		}
		const rpcURL: string = config.get('Perpetual.Network.host');
		const perp = new PerpetualProtocol({
			chainId: SupportedChainIds.OPTIMISM,
			// chainId: SupportedChainIds.OPTIMISM_GOERLI,
			providerConfigs: [
				{
					rpcUrl: rpcURL
				}
			]
		});

		await perp.init();

		const provider = new ethers.providers.JsonRpcProvider(rpcURL);
		const signer = new ethers.Wallet(process.env.ETH_PRIVATE_KEY, provider);
		await perp.connect({ signer });

		return perp;
	}
}

export default PerpetualConnector;
