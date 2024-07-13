import express, { Router } from 'express';
import { healthCheck } from '../../services/health/healthCheck';
import axios from 'axios';

const router: Router = express.Router();

router.get('/', async function checkHealth(req, res) {
	try {
		const result = await healthCheck();
		return res.send(result);
	} catch (error) {
		console.error(error);
		return res.status(500).send({
			status: 'ERROR',
			message: 'Health check failed',
			error: error.message
		});
	}
});

router.get('/geo', async function checkGeo(req, res) {
	try {
		const result = await axios.get('https://api.dydx.exchange/v3/geo')
		return res.send(result.data);
	} catch (error) {
		console.error(error);
		return res.status(500).send({
			status: 'ERROR',
			message: 'Geo check failed',
			error: error.message
		});
	}
});


export default router;
