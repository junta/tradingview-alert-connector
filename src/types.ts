import {
	OrderSide,
	OrderType,
	TimeInForce,
	Market
} from '@dydxprotocol/v3-client';
import { PositionSide } from '@perp/sdk-curie';

export type AlertObject = {
	exchange: string;
	strategy: string;
	market: string;
	size?: number;
	sizeUsd?: number;
	sizeByLeverage?: number;
	order: string;
	price: number;
	position: string;
	reverse: boolean;
	passphrase?: string;
	type: OrderType;
	trailingPercent?: string;
	expirationDays?: number;
	stopLimitPercent?: number;
	leverage: string;
};

export type dydxOrderParams = {
	market: Market;
	side: OrderSide;
	type: OrderType;
	timeInForce: TimeInForce.FOK;
	postOnly: false;
	size: string;
	price: string;
	limitFee: string;
	expiration: string;
	trailingPercent: string;
	triggerPrice: string;
};

export type perpOrderParams = {
	tickerSymbol: string;
	side: PositionSide;
	amountInput: number;
	isAmountInputBase: boolean;
	referralCode: string;
};

export type HealthCheck = {
	status: 'OK' | 'ERROR';
	message: string;
	error?: string;
};
