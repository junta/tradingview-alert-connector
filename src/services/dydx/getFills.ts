import DYDXConnector from './client';
import { FillResponseObject } from '@dydxprotocol/v3-client';
import { _sleep } from '../../helper';

export const getFills = async (): Promise<FillResponseObject[]> => {
	const createdBeforeOrAt = new Date(
		Date.now() - 24 * 60 * 60 * 1000
	).toISOString();

	const connector = await DYDXConnector.build();
	const response = await connector.client.private.getFills({
		createdBeforeOrAt: new Date(Date.now()).toISOString()
	});
	const result = response.fills.filter((res) => {
		if (new Date(res.createdAt) >= new Date(createdBeforeOrAt)) {
			return res;
		}
	});
	
	return result;
};
