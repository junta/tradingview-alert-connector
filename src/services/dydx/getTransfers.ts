import DYDXConnector from './client';
import { TransferResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getTransfers = async (): Promise<TransferResponseObject[]> => {
	const connector = await DYDXConnector.build();
	const transfersResponse = await connector.client.private.getTransfers(
		{
			limit: 100,
		},
	  );
	
	return transfersResponse;
};
