import { ExchangeRouterAbi } from './abi/exchangeRounter';
import { ethers } from 'ethers';
import { gmxOrderParams, gmxOrderResult } from '../../types';
import { erc20Abi } from './abi/erc20';
import { getGmxClient } from './client';
import { ReaderAbi } from './abi/reader';
import { gmxOrderType } from './constants';

const exchangeRounter = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const transferRouter = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const reader = '0xf60becbba223eea9495da3f606753867ec10d139';
const dataStore = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8';

const orderVault = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5';
const usdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const usdcDecimal = 6;

const executionFee = ethers.utils.parseEther('0.0015675');
const signer = getGmxClient();

export const gmxCreateOrder = async (orderParams: gmxOrderParams) => {
	try {
		const parsedSizeUsd = ethers.utils.parseUnits(
			String(orderParams.sizeUsd),
			usdcDecimal
		);

		await checkAndApprove(parsedSizeUsd);

		const gmxContract = new ethers.Contract(
			exchangeRounter,
			ExchangeRouterAbi,
			signer
		);

		const [hasLongPosition, orderType] = await getOrderType(
			orderParams.marketAddress,
			orderParams.isLong
		);

		// TODO: calculate
		const withdrawAmount = 1.26;

		const initialCollateralDeltaAmount =
			orderType === gmxOrderType.MarketIncrease
				? 0
				: ethers.utils.parseUnits(String(withdrawAmount), usdcDecimal);

		const decreasePositionSwapType =
			orderType === gmxOrderType.MarketIncrease ? 0 : 1;
		const sizeDeltaUsd = ethers.utils.parseUnits(
			String(orderParams.sizeUsd),
			30
		);
		const acceptablePrice = getAcceptablePrice(
			orderParams.isLong,
			orderParams.price
		);

		const createOrderParam = {
			addresses: {
				receiver: signer.address,
				callbackContract: '0x0000000000000000000000000000000000000000',
				uiFeeReceiver: '0x0000000000000000000000000000000000000000',
				market: orderParams.marketAddress,
				initialCollateralToken: usdc,
				swapPath: []
			},
			numbers: {
				sizeDeltaUsd,
				initialCollateralDeltaAmount,
				triggerPrice: 0,
				acceptablePrice,
				executionFee,
				callbackGasLimit: 0,
				minOutputAmount: 0
			},
			orderType,
			decreasePositionSwapType,
			isLong: hasLongPosition ?? orderParams.isLong,
			shouldUnwrapNativeToken: false,
			referralCode:
				'0x74765f616c6572745f636f6e6e6563746f720000000000000000000000000000'
			// 0x0000000000000000000000000000000000000000000000000000000000000000
		};

		console.log('createOrderParam: ', createOrderParam);

		const createOrderData = gmxContract.interface.encodeFunctionData(
			'createOrder',
			[createOrderParam]
		);

		const multiCallParams = [
			gmxContract.interface.encodeFunctionData('sendWnt', [
				orderVault,
				executionFee
			]),
			// TODO: set only when marketIncreaase
			// gmxContract.interface.encodeFunctionData('sendTokens', [
			// 	usdc,
			// 	orderVault,
			// 	parsedSizeUsd
			// ]),
			createOrderData
		];

		const tx = await gmxContract.multicall(multiCallParams, {
			value: executionFee,
			gasLimit: 20000000
		});
		console.log('Order created successfully:', tx);

		const receipt = await tx.wait();
		console.log('tx receipt', receipt);

		return {
			txHash: tx.hash,
			sizeUsd: orderParams.sizeUsd,
			isLong: orderParams.isLong
		} as gmxOrderResult;
	} catch (error) {
		console.error(error);
	}
};

export const checkAndApprove = async (amount) => {
	const usdcContract = new ethers.Contract(usdc, erc20Abi, signer);
	try {
		const allowance = await usdcContract.allowance(
			signer.address,
			transferRouter
		);

		if (allowance.lt(amount)) {
			const tx = await usdcContract.approve(transferRouter, amount);
			console.log('Approving USDC, TxHash: ', tx.hash);
			await tx.wait();
			console.log('Approved');
		} else {
			console.log('Enough allowance');
		}
	} catch (error) {
		console.error('An error occurred while Approving USDC:', error);
	}
};

export const getOrderType = async (
	market: string,
	isLongOrder: boolean
): Promise<[boolean, gmxOrderType]> => {
	const readerContract = new ethers.Contract(reader, ReaderAbi, signer);

	const positions = await readerContract.getAccountPositions(
		dataStore,
		signer.address,
		0,
		ethers.constants.MaxUint256
	);

	const position = positions.find((position) => {
		return position['addresses']['market'] === market;
	});

	const hasLongPosition = position && position['flags']['isLong'];

	// no existing position, always marketIncrease order
	if (!position) return [null, gmxOrderType.MarketIncrease];

	// if it's the same order direction, marketIncrease order
	if ((hasLongPosition && isLongOrder) || (!hasLongPosition && !isLongOrder)) {
		return [hasLongPosition, gmxOrderType.MarketIncrease];
	} else {
		return [hasLongPosition, gmxOrderType.MarketDecrease];
	}
};

export const getAcceptablePrice = (isLong: boolean, price: number) => {
	// const slippage = 0.05;
	// const multiplier = isLong ? 1 + slippage : 1 - slippage;
	// return ethers.utils.parseUnits(String(price * multiplier), 22);

	// temporary fix
	return isLong ? ethers.constants.MaxUint256 : 1;
};
