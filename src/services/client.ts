import { DydxClient } from '@dydxprotocol/v3-client';
import { HTTP_HOST, HTTP_STAGING_HOST } from '../constants';

import 'dotenv/config';

const apiKeys = {
	key: process.env.API_KEY,
	passphrase: process.env.API_PASSPHRASE,
	secret: process.env.API_SECRET
};

const starkKeyPair = {
	publicKey: process.env.STARK_PUBLIC_KEY,
	privateKey: process.env.STARK_PRIVATE_KEY
};

const dydxClient: DydxClient = new DydxClient(HTTP_HOST, {
	apiTimeout: 3000,
	networkId: 1, // 3
	apiKeyCredentials: apiKeys,
	starkPrivateKey: starkKeyPair
});

export default dydxClient;
