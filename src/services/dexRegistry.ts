import { AbstractDexClient } from './abstractDexClient';
import { BluefinDexClient } from './bluefin/bluefinClient';
import { DydxV3Client } from './dydx_v3/dydxV3Client';
import { DydxV4Client } from './dydx_v4/dydxV4Client';
import { GmxClient } from './gmx/gmxClient';
import { PerpClient } from './perp/perpClient';
import { AlertObject } from '../types';

export class DexRegistry {
	private registeredDexs: Map<string, new (alertMessage?: AlertObject) => AbstractDexClient>;

    constructor() {
        this.registeredDexs = new Map();
        this.registeredDexs.set('dydxv4', DydxV4Client);
        this.registeredDexs.set('dydxv3', DydxV3Client);
        this.registeredDexs.set('dydx', DydxV4Client);
        this.registeredDexs.set('perpetual', PerpClient);
        this.registeredDexs.set('gmx', GmxClient);
        this.registeredDexs.set('bluefin', BluefinDexClient);
    }

	getDex(dexKey: string, alertMessage?: AlertObject): AbstractDexClient | undefined {
		const DexClass = this.registeredDexs.get(dexKey.toLowerCase());
    if (!DexClass) return undefined;
    
    return new DexClass(alertMessage);
	}

	getAllDexKeys(): string[] {
		return Array.from(this.registeredDexs.keys());
	}
}
