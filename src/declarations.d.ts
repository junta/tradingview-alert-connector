declare namespace NodeJS {
	interface ProcessEnv {
		readonly DYDX_V4_MNEMONIC: string;
		readonly PERPETUAL_PRIVATE_KEY: string;
		readonly GMX_PRIVATE_KEY: string;
		readonly GMX_LEVERAGE: string;
		readonly BLUEFIN_MNEMONIC: string;
		readonly HYPERLIQUID_PRIVATE_KEY: string;
		readonly TRADINGVIEW_PASSPHRASE: string;
		readonly SENTRY_DNS: string;
	}
}
