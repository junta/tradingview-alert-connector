import {
	OrderSide,
	OrderType,
	TimeInForce,
	Market
} from '@dydxprotocol/v3-client';
import { PositionSide } from '@perp/sdk-curie';
import { gmxOrderType } from './services/gmx/constants';
import { PositionStatus, OrderSide as v4OrderSide } from '@dydxprotocol/v4-client-js';

export type AlertObject = {
	exchange: string;
	strategy: string;
	market: string;
	size?: number;
	sizeUsd?: number;
	sizeByLeverage?: number;
	order: string;
	price: number;
	reverse: boolean;
	passphrase?: string;
	collateral?: string;
	slippagePercentage?: string;
	orderMode?: '' | 'full';
	newPositionSize: number;
	direction?: string;
	minProfit?: number;
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

export interface MarketData {
	market: string;
	status: PositionStatus;
	side: string;
	size: number;
	maxSize: string;
	entryPrice: number;
	exitPrice: string | null;
	realizedPnl: string;
	unrealizedPnl: string;
	createdAt: string;
	createdAtHeight: string;
	closedAt: string | null;
	sumOpen: string;
	sumClose: string;
	netFunding: string;
	subaccountNumber: number;
}

export interface PositionData {
	positions: MarketData[];
}
