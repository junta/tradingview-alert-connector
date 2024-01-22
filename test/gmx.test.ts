import { gmxTokenMap } from '../src/services/gmx/constants';
import {
	checkAndApprove,
	getAcceptablePrice,
	getOrderTypeAndPosition,
	gmxCreateOrder
} from '../src/services/gmx/createOrder';
import { gmxExportOrder } from '../src/services/gmx/exportOrder';
import { decimalToFloat } from '../src/services/gmx/math';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { gmxOrderParams, gmxOrderResult } from '../src/types';

jest.setTimeout(40000);

describe('getOrderType', () => {
	it('should return marketIncrease when no position', async () => {
		const [hasLongPosition, orderType] = await getOrderTypeAndPosition(
			gmxTokenMap.get('BTC_USD')!,
			true
		);
		console.log(hasLongPosition);
		expect(orderType).toEqual(2);
	});

	it('should return marketIncrease when long order + have long position', async () => {
		const [hasLongPosition, orderType] = await getOrderTypeAndPosition(
			gmxTokenMap.get('DOGE_USD')!,
			true
		);

		console.log(hasLongPosition);
		expect(orderType).toEqual(2);
	});

	it('should return marketDecrease when short order + have long position', async () => {
		const [hasLongPosition, orderType] = await getOrderTypeAndPosition(
			gmxTokenMap.get('DOGE_USD')!,
			false
		);

		console.log(hasLongPosition);
		expect(orderType).toEqual(4);
	});

	it('should return hasLongPosition=false', async () => {
		const [hasLongPosition, orderType] = await getOrderTypeAndPosition(
			gmxTokenMap.get('XRP_USD')!,
			false
		);

		console.log(hasLongPosition);
	});
});

describe('acceptablePrice', () => {
	it('should return acceptablePrice when long', () => {
		const price = 0.0804;
		const result = getAcceptablePrice(true, price);
		console.log(result);
	});

	it('should return acceptablePrice when short', () => {
		const price = 0.0804;
		const result = getAcceptablePrice(false, price);
		console.log(result);
	});

	it('should return convert price', () => {
		const price = '799679339123517056150';

		// console.log(ethers.utils.parseUnits(price.toString(), 24));
		console.log(ethers.utils.formatUnits(price.toString(), 22));
	});
});

describe('Approve', () => {
	it('should approve when needed', async () => {
		const usdcDecimal = 6;
		const sizeUsd = 100;
		const parsedSizeUsd = ethers.utils.parseUnits(String(sizeUsd), usdcDecimal);
		await checkAndApprove(parsedSizeUsd);
	});
});

describe('createOrder', () => {
	// decrease order
	it('should execute doge decrease order', async () => {
		const orderParams: gmxOrderParams = {
			marketAddress: gmxTokenMap.get('DOGE_USD')!,
			isLong: false,
			sizeUsd: 2.1,
			price: 0.083
		};
		const result = await gmxCreateOrder(orderParams);
	});

	it('should execute BTC new position order', async () => {
		const orderParams: gmxOrderParams = {
			marketAddress: gmxTokenMap.get('BTC_USD')!,
			isLong: false,
			sizeUsd: 2.1,
			price: 0.083
		};
		const result = await gmxCreateOrder(orderParams);
	});

	it('should execute order', async () => {
		const orderParams: gmxOrderParams = {
			marketAddress: gmxTokenMap.get('XRP_USD')!,
			isLong: true,
			sizeUsd: 2.1,
			price: 0.573
		};
		const result = await gmxCreateOrder(orderParams);
	});
});

describe('export order', () => {
	it('should export order', async () => {
		const mockOrderResponse = {
			txHash:
				'0xb5bc1145f5d7b4deeeff22e8ad7691cfccba04dacb3ea7d53be3d53ec0a35cf0',
			sizeUsd: 2.5,
			isLong: false
		} as gmxOrderResult;
		await gmxExportOrder('test_strategy', mockOrderResponse, 0.083, 'DOGE_USD');
	});
});
