import { DydxClient } from '@dydxprotocol/v3-client';

const HTTP_HOST = 'https://api.dydx.exchange';

const dydxClient: DydxClient = new DydxClient(HTTP_HOST, {
	apiTimeout: 3000
	// starkPrivateKey: '01234abcd...',
});

export default dydxClient;
