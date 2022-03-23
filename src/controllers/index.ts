import express, { Router } from 'express';
import {
	createOrder,
	getAccount,
	buildOrderParams,
	exportOrder,
	validateAlert
} from '../services';
import { OrderParams } from '../types';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	console.log('Recieved GET request.');

	const accountResult = await getAccount();

	res.send('OK');
});

router.post('/', async (req, res) => {
	console.log('Recieved Tradingview strategy alert:', req.body);

	const validated = await validateAlert(req.body);
	if (!validated) {
		return;
	}

	const orderParams: OrderParams | undefined = await buildOrderParams(req.body);

	let orderResult;
	if (orderParams) {
		orderResult = await createOrder(orderParams);
	}

	if (orderResult) {
		await exportOrder(
			req.body['strategy'],
			orderResult.order,
			req.body['price']
		);
	}

	res.send(orderResult);
});

router.get('/debug-sentry', function mainHandler(req, res) {
	throw new Error('My first Sentry error!');
});

export default router;
