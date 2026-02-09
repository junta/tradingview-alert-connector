# Tradingview-Alert-Connector

Tradingview-Alert-Connector is a free and noncustodial tool for you to Integrate tradingView alert and execute automated trading for perpetual futures DEXes.

Currently supports [dYdX v3](https://dydx.exchange), [dYdX v4](https://dydx.trade/?ref=LawfulBalletF7U), [Perpetual Protocol v2](https://perp.com/), [GMX v2](https://app.gmx.io/#/trade/), [Bluefin](https://trade.bluefin.io), and [Hyperliquid](https://hyperliquid.xyz/).

# Supported Exchanges

| Exchange | Network | Type |
|----------|---------|------|
| dYdX v3 | Ethereum L1 / StarkEx | Perpetual Futures |
| dYdX v4 | dYdX Chain | Perpetual Futures |
| Perpetual Protocol | Optimism L2 | Perpetual Futures |
| GMX v2 | Arbitrum | Perpetual Futures |
| Bluefin | Sui | Perpetual Futures |
| Hyperliquid | Hyperliquid L1 | Perpetual Futures |

# Docs

https://tv-connector.gitbook.io/docs/

# Video Tutorial

dYdX v3:
https://www.youtube.com/watch?v=I8hB2O2-xx4

Perpetual Protocol:
https://youtu.be/YqrOZW_mnUM

# Prerequisites

- TradingView Account at least Pro plan

https://www.tradingview.com/gopro/

- DEX(e.g. dYdX v4) account with collateral already in place

# Installation

```bash
git clone https://github.com/junta/tradingview-alert-connector.git
cd tradingview-alert-connector
npm install --force
```

# Quick Start

- rename .env.sample to .env
- fill environment variables in .env (see [full tutorial](https://tv-connector.gitbook.io/docs/setuup/running-on-local-pc#steps))

### Environment Variables

For Hyperliquid:
```
HYPERLIQUID_PRIVATE_KEY=
# Optional: referral code for 4% fee discount (applied once on first order)
HYPERLIQUID_REFERRAL_CODE=
# Optional: builder address to charge builder fee per order
HYPERLIQUID_BUILDER_ADDRESS=
```

The builder fee amount (in tenths of basis points) is configured in `config/production.yaml` under `Hyperliquid.User.builderFee` (default: 10 = 1 bps).

See `.env.sample` for all available environment variables for each exchange.

### with Docker

```bash
docker-compose build
docker-compose up -d
```

### without Docker

```bash
yarn start
```

# TradingView Alert Format

Set your TradingView alert webhook URL to your server's address (e.g., `http://your-server:3000/`) and use JSON format for the alert message:

### For Hyperliquid

```json
{
  "exchange": "hyperliquid",
  "strategy": "MyStrategy",
  "market": "BTC",
  "size": 0.01,
  "order": "buy",
  "price": {{close}},
  "position": "long",
  "reverse": false
}
```

The `market` field accepts multiple formats: `"BTC"`, `"BTC-USD"`, `"BTC-PERP"`, or `"BTC_USD"`.

### Order Sizing Options

Instead of a fixed `size`, you can use:
- `"sizeUsd": 1000` - Size in USD value (converted to base asset at current price)
- `"sizeByLeverage": 2` - Percentage of account equity as leverage

# Testing

```bash
npm test
```

## Disclaimer

This project is hosted under an MIT OpenSource License. This tool does not guarantee users’ future profit and users have to use this tool on their own responsibility.
