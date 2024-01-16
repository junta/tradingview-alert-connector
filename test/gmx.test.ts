import { gmxTokenMap } from '../src/services/gmx/constants';
import {
	checkAndApprove,
	getAcceptablePrice,
	getOrderType,
	gmxCreateOrder
} from '../src/services/gmx/createOrder';
import { decimalToFloat } from '../src/services/gmx/math';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { gmxOrderParams } from '../src/types';

jest.setTimeout(40000);

describe('getOrderType', () => {
	it('should return marketIncrease when no position', async () => {
		const [hasLongPosition, orderType] = await getOrderType(
			gmxTokenMap.get('BTC_USD')!,
			true
		);
		console.log(hasLongPosition);
		expect(orderType).toEqual(2);
	});

	it('should return marketIncrease when long order + have long position', async () => {
		const [hasLongPosition, orderType] = await getOrderType(
			gmxTokenMap.get('DOGE_USD')!,
			true
		);

		console.log(hasLongPosition);
		expect(orderType).toEqual(2);
	});

	it('should return marketDecrease when short order + have long position', async () => {
		const [hasLongPosition, orderType] = await getOrderType(
			gmxTokenMap.get('DOGE_USD')!,
			false
		);

		console.log(hasLongPosition);
		expect(orderType).toEqual(4);
	});

	it('should return hasLongPosition=false', async () => {
		const [hasLongPosition, orderType] = await getOrderType(
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
	it('should execute order', async () => {
		const orderParams: gmxOrderParams = {
			marketAddress: gmxTokenMap.get('DOGE_USD')!,
			isLong: false,
			sizeUsd: 3,
			price: 46234
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
