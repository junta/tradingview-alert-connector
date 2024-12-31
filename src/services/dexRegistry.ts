import { AbstractDexClient } from './abstractDexClient';
import { BluefinDexClient } from './bluefin/bluefinClient';
import { DydxV3Client } from './dydx_v3/dydxV3Client';
import { DydxV4Client } from './dydx_v4/dydxV4Client';
import { GmxClient } from './gmx/gmxClient';
import { PerpClient } from './perp/perpClient';

export class DexRegistry {
	private registeredDexs: Map<string, AbstractDexClient>;

	constructor() {
		this.registeredDexs = new Map();
		this.registeredDexs.set('dydxv4', new DydxV4Client());
		this.registeredDexs.set('dydxv3', new DydxV3Client());
		this.registeredDexs.set('dydx', new DydxV4Client());
		this.registeredDexs.set('perpetual', new PerpClient());
		this.registeredDexs.set('gmx', new GmxClient());
		this.registeredDexs.set('bluefin', new BluefinDexClient());
	}

	getDex(dexKey: string): AbstractDexClient {
		return this.registeredDexs.get(dexKey);
	}

	getAllDexKeys(): string[] {
		return Array.from(this.registeredDexs.keys());
	}
}
