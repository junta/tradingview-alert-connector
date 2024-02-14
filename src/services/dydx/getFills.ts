import DYDXConnector from './client';
import { FillResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getFills = async (): Promise<FillResponseObject[]> => {
	// const createdBeforeOrAt = new Date(
	// 	Date.now() - 24 * 60 * 60 * 1000
	// ).toISOString();

	const connector = await DYDXConnector.build();
	const response = await connector.client.private.getFills({
		limit: 100
	});

	return response.fills;
};
