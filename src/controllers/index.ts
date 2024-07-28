import express, { Router } from 'express';
import { validateAlert } from '../services';
import { DexRegistry } from '../services/dexRegistry';
import { CronJob } from 'cron';
import { MarketData } from '../types';
import * as fs from 'fs';

const router: Router = express.Router();
const dydxv4Client = new DexRegistry().getDex('dydxv4');

let openedPositions: MarketData[] = [];

function writeNewEntries({
	exchange,
	positions
}: {
	exchange: string;
	positions: MarketData[];
}) {
	const folderPath = './data/custom/exports/';
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, {
			recursive: true
		});
	}

	const fullPath = folderPath + `/tradeHistory${exchange}.csv`;
	if (!fs.existsSync(fullPath)) {
		const headerString =
			'market,status,side,size,maxSize,entryPrice,exitPrice,realizedPnl,unrealizedPnl,createdAt,createdAtHeight,closedAt,sumOpen,sumClose,netFunding,subaccountNumber';
		fs.writeFileSync(fullPath, headerString);
	}

	const records = fs.readFileSync(fullPath).toString('utf-8').split('\n');

	const newRecords = [];
	console.log(records);

	for (const position of positions) {
		const record: string[] = [
			position.market || '',
			position.status || '',
			position.side || '',
			position.size || '',
			position.maxSize || '',
			position.entryPrice || '',
			position.exitPrice || '',
			position.realizedPnl || '',
			position.unrealizedPnl || '',
			position.createdAt || '',
			position.createdAtHeight || '',
			position.closedAt || '',
			position.sumOpen || '',
			position.sumClose || '',
			position.netFunding || '',
			position.subaccountNumber?.toString() || ''
		];

		if (records.includes(record.toString())) continue;

		newRecords.push(record);
	}

	const appendString = newRecords.map((record) => `\n${record.join()}`).join();

	fs.appendFileSync(fullPath, appendString);
}

CronJob.from({
	cronTime: process.env.UPDATE_POSITIONS_TIMER || '*/30 * * * * *', // Every 30 seconds
	onTick: async () => {
		const { positions: newPositions = [] } = await dydxv4Client.getOpenedPositions();
		openedPositions = newPositions as unknown as MarketData[];
		writeNewEntries({ exchange: 'Dydxv4', positions: openedPositions });
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
