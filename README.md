# Tradingview-Alert-Connector

Tradingview-Alert-Connector is a free and noncustodial tool for you to Integrate tradingView alert and execute automated trading for perpetual futures DEXes.
Currently support [dYdX](https://dydx.exchange/) and [Perpetual Protocol](https://perp.com/).

# Docs

new URL

# Video Tutorial

https://www.youtube.com/watch?v=I8hB2O2-xx4
new URL

# Prerequisites

- TradingView Account at least Pro plan

https://www.tradingview.com/gopro/

- dYdX or Perpetual Protocol account with collateral already in place

https://dydx.exchange/
https://app.perp.com/

# Installation

```bash
git clone https://github.com/junta/dydx-tradingview-integration
cd dydx-tradingview-integration
yarn
```

# Quick Start

- rename .env.sample to .env
- fill environment variables in .env (see [full tutorial](https://dydx-tv.gitbook.io/dydx-tradingview-strategy-integration/setuup/running-on-local-pc#steps))

### with Docker

```bash
docker-compose build
docker-compose up -d
```

### without Docker

```bash
yarn start
```

## Disclaimer

This project is hosted under an MIT OpenSource License. This tool does not guarantee users’ future profit and users have to use this tool by their own responsibility.
