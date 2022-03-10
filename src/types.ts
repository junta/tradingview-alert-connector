import {
	OrderSide,
	OrderType,
	TimeInForce,
	Market
} from '@dydxprotocol/v3-client';

export type AlertObject = {
	strategy: string;
	market: string;
	size: number;
	order: string;
	price: number;
	reverse: boolean;
};

export type OrderParams = {
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
