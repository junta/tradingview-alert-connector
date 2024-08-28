import DYDXConnector from './client';
import { AccountLeaderboardPnlResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getPnl = async () => {
	const connector = await DYDXConnector.build();
	const pnlResponse = await connector.client.private.getAccountLeaderboardPnl(
        {
            period: "ALLTIME",
        },
    );

	return pnlResponse;
};