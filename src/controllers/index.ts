import express, { Router } from 'express';

import { getFill, createOrder, getAccount, checkAccount } from '../services';
import config = require('config');

const router: Router = express.Router();

router.get('/', async (req, res) => {
	// const fill = await getFill(
	// 	'2a128d9e2bde51ecc8dab5bb5147d154260eea60524886c32a3c8e065f2acd9'
	// );
	// res.send(fill);
	const orderResult = await getAccount();
	res.send(orderResult);
	// const orderResult = await createOrder();
	// res.send(orderResult);
	// const result = await getOrder(orderResult.order.id);
	// res.send(result);
	// console.log(req)
});

router.post('/', async (req, res) => {
	console.log('Recieve Tradingview strategy alert:', req.body);

	await checkAccount();

	const orderResult = await createOrder(req.body);

	res.send(orderResult);
});

export default router;
