import { AbstractDexClient } from './abstractDexClient';
import { BluefinDexClient } from './bluefin/bluefinClient';
import { DydxV4Client } from './dydx_v4/dydxV4Client';
import { GmxClient } from './gmx/gmxClient';
import { PerpClient } from './perp/perpClient';
import { HyperliquidClient } from './hyperliquid/hyperliquidClient';
import { GrvtDexClient } from './grvt/grvtClient';

export class DexRegistry {
	private registeredDexs: Map<string, AbstractDexClient>;

	constructor() {
		this.registeredDexs = new Map();
		this.registeredDexs.set('dydxv4', new DydxV4Client());
		this.registeredDexs.set('dydx', new DydxV4Client());
		this.registeredDexs.set('perpetual', new PerpClient());
		this.registeredDexs.set('gmx', new GmxClient());
		this.registeredDexs.set('bluefin', new BluefinDexClient());
		this.registeredDexs.set('hyperliquid', new HyperliquidClient());
		this.registeredDexs.set('grvt', new GrvtDexClient());
	}

	getDex(dexKey: string): AbstractDexClient {
		return this.registeredDexs.get(dexKey);
	}

	getAllDexKeys(): string[] {
		return Array.from(this.registeredDexs.keys());
	}
}
