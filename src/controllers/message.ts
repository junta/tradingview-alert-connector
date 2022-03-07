import express, { Router } from 'express';
import createOrder from '../services/createOrder';
import getOrder from '../services/getOrder';
import {
	Market,
	AccountResponseObject,
	OrderResponseObject
} from '@dydxprotocol/v3-client';
import config = require('config');

const router: Router = express.Router();

router.get('/', async (req, res) => {
	const strategies = config.get('Strategies');
	console.log(strategies);
	const orderResult = await createOrder();
	res.send(orderResult);

	// TODO: add interval timer
	// const result = await getOrder(orderResult.order.id);
	// res.send(result);

	// console.log(req);
});

router.post('/', async (req, res) => {
	// console.log(req.header);
	console.log(req.body);
	console.log(req.body['order']);
	// console.log(req);
});

export default router;
