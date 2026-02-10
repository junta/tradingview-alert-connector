# Tradingview-Alert-Connector

Tradingview-Alert-Connector is a free and noncustodial tool for you to Integrate tradingView alert and execute automated trading for perpetual futures DEXes.

Currently supports [dYdX v4](https://dydx.trade/?ref=LawfulBalletF7U), [Perpetual Protocol v2](https://perp.com/), [GMX v2](https://app.gmx.io/#/trade/), [Bluefin](https://trade.bluefin.io), and [Hyperliquid](https://app.hyperliquid.xyz/join/0XIBUKI).

# Supported Exchanges

| Exchange           | Network        | Type              |
| ------------------ | -------------- | ----------------- |
| dYdX v4            | dYdX Chain     | Perpetual Futures |
| Perpetual Protocol | Optimism L2    | Perpetual Futures |
| GMX v2             | Arbitrum       | Perpetual Futures |
| Bluefin            | Sui            | Perpetual Futures |
| Hyperliquid        | Hyperliquid L1 | Perpetual Futures |

# Docs

https://tv-connector.gitbook.io/docs/

# Video Tutorial

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
