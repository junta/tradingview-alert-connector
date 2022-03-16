import express, { Router } from 'express';
import { createOrder, getAccount, parseAlert, exportOrder } from '../services';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	// TODO: should change to show status
	const orderResult = await getAccount();
	res.send(orderResult);
});

router.post('/', async (req, res) => {
	console.log('Recieve Tradingview strategy alert:', req.body);

	const orderParams = await parseAlert(req.body);

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

export default router;
