declare namespace NodeJS {
	interface ProcessEnv {
		readonly ETH_ADDRESS: string;
		readonly STARK_PUBLIC_KEY: string;
		readonly STARK_PRIVATE_KEY: string;
		readonly API_KEY: string;
		readonly API_PASSPHRASE: string;
		readonly API_SECRET: string;
		readonly TRADINGVIEW_PASSPHRASE: string;
	}
}
