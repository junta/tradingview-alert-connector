import express, { Router } from 'express';
import { validateAlert } from '../services';
import { DexRegistry } from '../services/dexRegistry';
import { CronJob } from 'cron';
import { MarketData } from '../types';
import * as fs from 'fs';
import type { Position } from 'ccxt';
import { Mutex } from 'async-mutex';

const router: Router = express.Router();
const staticDexRegistry = new DexRegistry();
const dydxv4Client = staticDexRegistry.getDex('dydxv4');
const hyperliquidClient = staticDexRegistry.getDex('hyperliquid');
const bybitClient = staticDexRegistry.getDex('bybit');

let openedPositionsDydxv4: MarketData[] = [];
let openedPositionsHyperliquid: Position[] = [];
let openedPositionsBybit: Position[] = [];

const mutexDydxv4 = new Mutex();
const mutexHyperliquid = new Mutex();
const mutexBybit = new Mutex();

function writeNewEntries({
	exchange,
	positions
}: {
	exchange: 'Dydxv4' | 'Hyperliquid' | 'Bybit';
	positions: MarketData[] | Position[];
}) {
	const folderPath = './data/custom/exports/';
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, {
			recursive: true
		});
	}

	const fullPath = folderPath + `/positions${exchange}.csv`;
	if (!fs.existsSync(fullPath)) {
		const headerString =
			'market,status,side,size,maxSize,entryPrice,exitPrice,createdAt,createdAtHeight,closedAt,sumOpen,sumClose,netFunding,subaccountNumber';
		fs.writeFileSync(fullPath, headerString);
	}

	const records = fs.readFileSync(fullPath).toString('utf-8').split('\n');

	const newRecords = [];

	for (const position of positions) {
		let record: string[];

		if (exchange === 'Dydxv4') {
			const typedPosition = position as MarketData;

			record = [
				typedPosition.market || '',
				typedPosition.status || '',
				typedPosition.side || '',
				(typedPosition.size || 0).toString(),
				typedPosition.maxSize || '',
				(typedPosition.entryPrice || 0).toString(),
				typedPosition.exitPrice || '',
				typedPosition.createdAt || '',
				typedPosition.createdAtHeight || '',
				typedPosition.closedAt || '',
				typedPosition.sumOpen || '',
				typedPosition.sumClose || '',
				typedPosition.netFunding || '',
				typedPosition.subaccountNumber?.toString() || ''
			];
		}

		if (exchange === 'Hyperliquid' || exchange === 'Bybit') {
			const typedPosition = position as Position;

			record = [
				typedPosition.symbol || '',
				'OPEN',
				typedPosition.side || '',
				typedPosition.contracts?.toString() || '',
				'',
				typedPosition.entryPrice?.toString() || '',
				'',
				'',
				'',
				'',
				'',
				'',
				'',
				''
			];
		}

		if (
			records.includes(record.toString()) ||
			records.includes(`${record.toString()},`)
		)
			continue;

		newRecords.push(record);
	}

	const appendString = newRecords.map((record) => `\n${record.join()}`).join();

	fs.appendFileSync(fullPath, appendString);
}

const getExchangeVariables = (exchange: string) => {
	switch (exchange) {
		case 'dydxv4':
			return {
				openedPositions: openedPositionsDydxv4,
				mutex: mutexDydxv4
			};
		case 'hyperliquid':
			return {
				openedPositions: openedPositionsHyperliquid,
				mutex: mutexHyperliquid
			};
		case 'bybit':
			return {
				openedPositions: openedPositionsBybit,
				mutex: mutexBybit
			};
	}
};

const dydxv4Updater = async () => {
	try {
		const { positions: dydxv4Positions } =
			await dydxv4Client.getOpenedPositions();
		openedPositionsDydxv4 = dydxv4Positions as unknown as MarketData[];
		writeNewEntries({
			exchange: 'Dydxv4',
			positions: openedPositionsDydxv4
		});
	} catch {
		console.log(`Dydxv4 is not working. Time: ${new Date()}`);
	}
};

const hyperLiquidUpdater = async () => {
	try {
		const hyperliquidPositions = await hyperliquidClient.getOpenedPositions();
		openedPositionsHyperliquid = hyperliquidPositions as unknown as Position[];
		writeNewEntries({
			exchange: 'Hyperliquid',
			positions: openedPositionsHyperliquid
		});
	} catch {
		console.log(`Hyperliquid is not working. Time: ${new Date()}`);
	}
};

const bybitUpdater = async () => {
	try {
		const bybitPositions = await bybitClient.getOpenedPositions();
		openedPositionsBybit = bybitPositions as unknown as Position[];
		writeNewEntries({
			exchange: 'Bybit',
			positions: openedPositionsBybit
		});
	} catch {
		console.log(`Bybit is not working. Time: ${new Date()}`);
	}
};

CronJob.from({
	cronTime: process.env.UPDATE_POSITIONS_TIMER || '*/30 * * * * *', // Every 30 seconds
	onTick: async () => {
		await Promise.all([dydxv4Updater(), hyperLiquidUpdater(), bybitUpdater()]);
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
	const dexNames = [
		'dydxv3',
		'dydxv4',
		'perpetual',
		'gmx',
		'bluefin',
		'hyperliquid',
		'bybit'
	];
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
			Bluefin: accountStatuses[4], // bluefin
			HyperLiquid: accountStatuses[5], // hyperliquid
			Bybit: accountStatuses[6] // bybit
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
		const { openedPositions, mutex } = getExchangeVariables(exchange);
		await dexClient.placeOrder(req.body, openedPositions, mutex);

		res.send('OK');
		// checkAfterPosition(req.body);
	} catch (e) {
		res.send('error');
	}
});

// router.get('/debug-sentry', function mainHandler(req, res) {
// 	throw new Error('My first Sentry error!');
// });

export default router;
