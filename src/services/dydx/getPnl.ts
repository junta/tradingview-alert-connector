import DYDXConnector from './client';
import { AccountLeaderboardPnlResponseObject, AccountLeaderboardPnlPeriod } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getPnl = async () => {
	const connector = await DYDXConnector.build();
	const pnlResponse = await connector.client.private.getAccountLeaderboardPnl(
        AccountLeaderboardPnlPeriod.ALL_TIME, 
        {}
    );

	return pnlResponse;
};