import DYDXConnector from './client';
import { HistoricalPnlResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const historicalPnl = async () => {
	const connector = await DYDXConnector.build();
	const pnl: { historicalPnl: HistoricalPnlResponseObject[] } =
		await connector.client.private.getHistoricalPnl({});
	return pnl.historicalPnl;
};
