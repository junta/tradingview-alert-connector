import express, { Router } from 'express';
import dydxClient from '../services/client';
import createOrder from '../services/createOrder';
import {
	Market,
	AccountResponseObject,
	OrderResponseObject
} from '@dydxprotocol/v3-client';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	// const markets = await dydxClient.public.getMarkets(Market.BTC_USD);

	// const account: { account: AccountResponseObject } =
	// 	await dydxClient.private.getAccount(
	// 		'0x50fe1109188A0B666c4d78908E3E539D73F97E33'
	// 	);
	// res.send(account);

	console.log(dydxClient.starkPrivateKey);

	const result = await createOrder();
	res.send(result);
});

export default router;
