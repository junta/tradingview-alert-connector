import HyperliquidConnector from './client';

export const hyperliquidGetAccount = async () => {
	try {
		const connector = HyperliquidConnector.build();
		if (!connector) return false;

		const accountState = await connector.getAccountState();
		const accountValue = parseFloat(
			accountState.marginSummary.accountValue
		);
		console.log('Hyperliquid account value:', accountValue);

		if (accountValue == 0) {
			return false;
		} else {
			return true;
		}
	} catch (error) {
		console.error(error);
		return false;
	}
};
