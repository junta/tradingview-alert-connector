import express, { Router } from 'express';
import dydxClient from '../services/client';
import { Market } from '@dydxprotocol/v3-client';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	const markets = await dydxClient.public.getMarkets(Market.BTC_USD);

	res.send(markets);
});

export default router;
