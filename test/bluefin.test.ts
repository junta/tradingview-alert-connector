import { BluefinDexClient } from '../src/services/bluefin/bluefinClient';
import { AlertObject } from '../src/types';

jest.setTimeout(40000);

describe('Bluefin', () => {
	it('should post order', async () => {
		const client = new BluefinDexClient();
		const alertMessage: AlertObject = {
			strategy: 'macdDoge_gmx',
			market: 'DOGE_USD',
			sizeUsd: 5,
			reverse: false,
			order: 'buy',
			position: 'long',
			price: 0.16,
			exchange: 'bluefin',
			passphrase: 'ibuki8918'
		};

		const order = await client.placeOrder(alertMessage);
		console.log(order);
	});

	it('should get account', async () => {
		const client = new BluefinDexClient();
		const order = await client.getIsAccountReady();
		console.log(order);
	});
});
