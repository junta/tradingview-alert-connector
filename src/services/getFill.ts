import DYDXConnector from './client';
import { FillResponseObject } from '@dydxprotocol/v3-client';

const getFill = async (order_id: string) => {
	try {
		const connector = await DYDXConnector.build();
		const allFills: { fills: FillResponseObject[] } =
			await connector.client.private.getFills({ orderId: order_id });

		return allFills.fills[0];
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export default getFill;
