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
	dydxV4CreateOrder
} from '../services';
import { gmxBuildOrderParams } from '../services/gmx/buildOrderParams';
import { gmxCreateOrder } from '../services/gmx/createOrder';
import { gmxGetAccount } from '../services/gmx/getAccount';
import { gmxExportOrder } from '../services/gmx/exportOrder';
import { dydxV4BuildOrderParams } from '../services/dydx_v4/buildOrderParams';
import { dydxV4ExportOrder } from '../services/dydx_v4/exportOrder';
import { dydxV4GetAccount } from '../services/dydx_v4/getAccount';

const router: Router = express.Router();

router.get('/', async (req, res) => {
	console.log('Recieved GET request.');

	const [dydxAccount, perpAccount, gmxAccount, dydxV4Account] =
		await Promise.all([
			dydxGetAccount(),
			perpGetAccount(),
			gmxGetAccount(),
			dydxV4GetAccount()
		]);

	if (!dydxAccount && !perpAccount && !gmxAccount && !dydxV4Account) {
		res.send('Error on getting account data');
	} else {
		const message =
			'dYdX v3 Account Ready:' +
			dydxAccount +
			', \n  dYdX v4 Account Ready:' +
			dydxV4Account?.isReady +
			', \n   Perpetual Protocol Account Ready:' +
			perpAccount +
			', \n   GMX Account Ready:' +
			gmxAccount;
		res.send(message);
	}
});

router.post('/', async (req, res) => {
	console.log('Recieved Tradingview strategy alert:', req.body);

	const validated = await validateAlert(req.body);
	if (!validated) {
		res.send('Error. alert message is not valid');
		return;
	}

	try {
		let orderResult;

		const exchange = req.body['exchange'].toLowerCase();
		switch (exchange) {
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
			case 'gmx': {
				const orderParams = await gmxBuildOrderParams(req.body);
				if (!orderParams) return;
				orderResult = await gmxCreateOrder(orderParams);
				if (!orderResult) throw Error('Order is not executed');
				await gmxExportOrder(
					req.body['strategy'],
					orderResult,
					req.body['price'],
					req.body['market']
				);
				break;
			}
			case 'dydxv4': {
				const orderParams = await dydxV4BuildOrderParams(req.body);
				if (!orderParams) return;
				orderResult = await dydxV4CreateOrder(orderParams);
				if (!orderResult) throw Error('Order is not executed');
				await dydxV4ExportOrder(
					req.body['strategy'],
					orderResult,
					req.body['price'],
					req.body['market']
				);
				break;
			}
			default: {
				const orderParams = await dydxBuildOrderParams(req.body);
				if (!orderParams) return;
				orderResult = await dydxCreateOrder(orderParams);
				if (!orderResult) throw Error('Order is not executed');
				await dydxExportOrder(
					req.body['strategy'],
					orderResult.order,
					req.body['price']
				);
			}
		}
		res.send('OK');
		// checkAfterPosition(req.body);
	} catch (e) {
		res.send('error');
	}
});

router.get('/debug-sentry', function mainHandler(req, res) {
	throw new Error('My first Sentry error!');
});

export default router;
