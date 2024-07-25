import express, { Router } from 'express';
import { validateAlert } from '../services';
import { DexRegistry } from '../services/dexRegistry';
import { CronJob } from 'cron';
import { createObjectCsvWriter } from 'csv-writer';
import { MarketData } from '../types';

const router: Router = express.Router();
const dydxv4Client = new DexRegistry().getDex('dydxv4');

let openedPositions: MarketData[];
let previousPositions: MarketData[];

const csvWriter = createObjectCsvWriter({
	path: 'market_data.csv',
	header: [
		{ id: 'market', title: 'Market' },
		{ id: 'status', title: 'Status' },
		{ id: 'side', title: 'Side' },
		{ id: 'size', title: 'Size' },
		{ id: 'maxSize', title: 'Max Size' },
		{ id: 'entryPrice', title: 'Entry Price' },
		{ id: 'exitPrice', title: 'Exit Price' },
		{ id: 'realizedPnl', title: 'Realized PnL' },
		{ id: 'unrealizedPnl', title: 'Unrealized PnL' },
		{ id: 'createdAt', title: 'Created At' },
		{ id: 'createdAtHeight', title: 'Created At Height' },
		{ id: 'closedAt', title: 'Closed At' },
		{ id: 'sumOpen', title: 'Sum Open' },
		{ id: 'sumClose', title: 'Sum Close' },
		{ id: 'netFunding', title: 'Net Funding' },
		{ id: 'subaccountNumber', title: 'Subaccount Number' }
	],
	append: true
});

function writeNewEntries(newData: MarketData[]) {
	const newEntries = newData.filter(
		(item) => !previousPositions.includes(item)
	);

	if (newEntries.length > 0) {
		csvWriter
			.writeRecords(newEntries)
			.then(() => console.log('The CSV file was updated with new entries.'))
			.catch((err) => console.error('Error writing to CSV file', err));

		previousPositions = [...newData];
	}
}

CronJob.from({
	cronTime: process.env.UPDATE_POSITIONS_TIMER || '*/30 * * * * *', // Every 30 seconds
	onTick: async () => {
		console.log(new Date());
		const { positions: newPositions } = await dydxv4Client.getOpenedPositions();
		openedPositions = newPositions as unknown as MarketData[];
		console.log(openedPositions);
		writeNewEntries(openedPositions);
	},
	runOnInit: true,
	start: true
});

router.get('/', async (req, res) => {
	res.send('OK');
});

router.get('/accounts', async (req, res) => {
	console.log('Received GET request.');

	const dexRegistry = new DexRegistry();
	const dexNames = ['dydxv3', 'dydxv4', 'perpetual', 'gmx', 'bluefin'];
	const dexClients = dexNames.map((name) => dexRegistry.getDex(name));

	try {
		const accountStatuses = await Promise.all(
			dexClients.map((client) => client.getIsAccountReady())
		);

		const message = {
			dYdX_v3: accountStatuses[0], // dydxv3
			dYdX_v4: accountStatuses[1], // dydxv4
			PerpetualProtocol: accountStatuses[2], // perpetual
			GMX: accountStatuses[3], // gmx
			Bluefin: accountStatuses[4] // bluefin
		};
		res.send(message);
	} catch (error) {
		console.error('Failed to get account readiness:', error);
		res.status(500).send('Internal server error');
	}
});

router.post('/', async (req, res) => {
	console.log('Recieved Tradingview strategy alert:', req.body);

	const validated = await validateAlert(req.body);
	if (!validated) {
		res.send('Error. alert message is not valid');
		return;
	}

	// set dydxv3 by default for backwards compatibility
	const exchange = req.body['exchange']?.toLowerCase() || 'dydxv3';

	const dexClient = new DexRegistry().getDex(exchange);

	if (!dexClient) {
		res.send(`Error. Exchange: ${exchange} is not supported`);
		return;
	}

	// TODO: add check if dex client isReady

	try {
		const result = await dexClient.placeOrder(req.body, openedPositions);

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
