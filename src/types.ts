import {
	OrderSide,
	OrderType,
	TimeInForce,
	Market
} from '@dydxprotocol/v3-client';
import { PositionSide } from '@perp/sdk-curie';
import { gmxOrderType } from './services/gmx/constants';
import { OrderSide as v4OrderSide } from '@dydxprotocol/v4-client-js';
import { ProfileName } from './utils/envLoader';

export type AlertObject = {
	exchange: string;
	envProfile?: ProfileName; // optional, since users may only use 1 profile/config. expects empty or "P1", "P2", "P3", etc.
	strategy: string; // convenience field - no impact on trade execution.
	market: string;
	size?: number;           // only use one of these "size___" fields at a time
	sizeUsd?: number;
	sizeByLeverage?: number;
	order: string;
	price: number;
	position: string;
	reverse: boolean;
	passphrase?: string;
	collateral?: string;
};

export type dydxOrderParams = {
	market: Market;
	side: OrderSide;
	type: OrderType.MARKET;
	timeInForce: TimeInForce.FOK;
	postOnly: false;
	size: string;
	price: string;
	limitFee: string;
	expiration: string;
};

export type dydxV4OrderParams = {
	market: string;
	side: v4OrderSide;
	size: number;
	price: number;
};

export type perpOrderParams = {
	tickerSymbol: string;
	side: PositionSide;
	amountInput: number;
	isAmountInputBase: boolean;
	referralCode: string;
};

export type gmxOrderParams = {
	marketAddress: string;
	isLong: boolean;
	sizeUsd: number;
	price: number;
	collateral?: string;
};

export type gmxOrderResult = {
	txHash: string;
	sizeUsd: number;
	isLong: boolean;
};

export type GmxPositionResponse = {
	orderType: gmxOrderType;
	hasLongPosition?: boolean;
	positionSizeUsd?: number;
	collateralAmount?: number;
};

export interface OrderResult {
	size: number;
	side: string;
	orderId: string;
}

// {
//     "exchange": "gmx",
//     "strategy": "Config 1 - Swings, High PnL",
//     "market": "SOL_USD",
//     "sizeByLeverage": 3,
//     "reverse": false,
//     "order":"{{strategy.order.action}}",
//     "position":"{{strategy.market_position}}",
//     "price":"{{strategy.order.price}}"
// }