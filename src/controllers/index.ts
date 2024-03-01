import express, { Router } from 'express';
import {
	dydxCreateOrder,
	dydxGetAccount,
	dydxBuildOrderParams,
	dydxExportOrder,
	validateAlert,
	checkAfterPosition,
	perpCreateOrder,
	perpBuildOrderParams,
	perpGetAccount,
	perpExportOrder,
	getOrder,
	getFills,
	getOrders
} from '../services';
import { cancelOrder } from '../services/dydx/cancleOrder';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	console.log('Recieved GET request.');

	const dydxAccount = await dydxGetAccount();
	const perpAccount = await perpGetAccount();

	if (!dydxAccount) {
		res.send('Error on getting account data');
	} else {
		const message =
			`dYdX Account Read (${process.env.ETH_ADDRESS}): ` +
			dydxAccount +
			'\n  Perpetual Protocol Account Ready: ' +
			perpAccount;
		res.send(message);
	}
});

router.post('/', async (req, res) => {
	console.log('Recieved Tradingview strategy alert:', req.body);

	if (process.env.APP_API_KEY !== req.header('app-api-key')) {
		res.sendStatus(401);
		return;
	}

	const validated = await validateAlert(req.body);
	if (!validated) {
		res.status(400).send('Error. alert message is not valid');
		return;
	}
	try {
		// if (!orderParams) return;
		let orderResult;
		switch (req.body['exchange']) {
			case 'perpetual': {
				const orderParams = await perpBuildOrderParams(req.body);
				if (!orderParams) return;
				orderResult = await perpCreateOrder(orderParams);
				await perpExportOrder(
					req.body['strategy'],
					orderResult,
					req.body['price'],
					req.body['market']
				);
				break;
			}
			default: {
				// console.log(req.body)
				const orderParams = await dydxBuildOrderParams(req.body);
				if (!orderParams) return;
				orderResult = await dydxCreateOrder(orderParams);
				if (!orderResult) {
					res.sendStatus(500);
					return;
				}
				res.json(orderResult);
				return;
				// await dydxExportOrder(
				// 	req.body['strategy'],
				// 	orderResult.order,
				// 	req.body['price']
				// );
			}
		}

		// checkAfterPosition(req.body);

		res.send('OK');
		return;
	} catch (error) {
		console.log(error);

		res.sendStatus(400);
	}
});

router.get('/debug-sentry', function mainHandler(req, res) {
	throw new Error('My first Sentry error!');
});

router.get('/orders', async function mainHandler(req, res) {
	try {
		const result = await getOrders();
		if (!result) res.json([]);
		else res.json(result);
	} catch (error) {
		res.sendStatus(400);
	}
});

router.get('/order/:id', async function mainHandler(req, res) {
	try {
		const result = await getOrder(req.params['id']);
		res.json(result);
	} catch (error) {
		res.sendStatus(400);
	}
});

router.get('/fills', async function mainHandler(req, res) {
	try {
		const result = await getFills();

		if (!result) res.json([]);
		else res.json(result);
	} catch (error) {
		res.sendStatus(400);
	}
});

router.delete('/order/:id', async function mainHandler(req, res) {
	try {
		const result = await cancelOrder(req.params['id']);
		res.json(result);
	} catch (error) {
		res.sendStatus(400);
	}
});

export default router;
