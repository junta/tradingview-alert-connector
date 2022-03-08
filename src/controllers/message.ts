import express, { Router } from 'express';
import createOrder from '../services/createOrder';
import getOrder from '../services/getOrder';
import checkStrategy from '../services/checkStrategy';
import config = require('config');

const router: Router = express.Router();

router.get('/', async (req, res) => {
	// const orderResult = await createOrder();
	// res.send(orderResult);
	// TODO: add interval timer
	// const result = await getOrder(orderResult.order.id);
	// res.send(result);
	// console.log(req)
});

router.post('/', async (req, res) => {
	// console.log(req.header);
	console.log('get post');
	const strategy = checkStrategy(req.body);
	let orderResult;
	if (strategy) {
		orderResult = await createOrder(strategy);
	}
	res.send(orderResult);
});

export default router;
