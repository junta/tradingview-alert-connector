# MTE-Automation

MTE-Automation is a noncustodial tool for you to Integrate TradingView trade alerts from the Momentum Trading Engine to execute trades on perpetual furure DEXs.

Currently supports [dYdX v3](https://dydx.exchange), [dYdX v4](https://dydx.trade/), [Perpetual Protocol v2](https://perp.com/), [GMX v2](https://app.gmx.io/#/trade/) and [Bluefin](https://trade.bluefin.io).

This code repository began as a fork of the powerful junta "tradingview-alert-connector", the objective is to refacfor the code base to allow for countless trading configurations to be forward tested from the Momentum Trading Engine (MTE)! 

The goal is to have .env setup for each instance of a trading configuration you want to launch. This allows you to, for example; test Configuration 1 on BTC/USD in one container while simultaneously test Configuration 2 on SOL/USD in another container etc each configuration is unique to asset pairs, time periods, leverage, equity % etc

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

This project is hosted under an MIT OpenSource License. This tool does not guarantee users’ future profit and users have to use this tool on their own responsibility.
