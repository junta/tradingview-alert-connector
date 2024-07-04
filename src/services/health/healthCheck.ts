import { HealthCheck } from '../../types';
import DYDXConnector from '../dydx/client';

export const healthCheck = async (): Promise<HealthCheck> => {
	try {
		const connector = await DYDXConnector.build();
		if (!connector || !connector.client)
			throw new Error('Connector not initialized');
		return {
			status: 'OK',
			message: 'Health check passed'
		};
	} catch (error) {
		console.error(error);
		throw error;
	}
};
