import { ExchangeRouterAbi } from './abi/exchangeRounter';
import { ethers } from 'ethers';
import { gmxOrderParams, gmxOrderResult } from '../../types';
import { erc20Abi } from './abi/erc20';
import { getGmxClient } from './client';
import { ReaderAbi } from './abi/reader';
import { BASE_DECIMAL, gmxOrderType } from './constants';
import { _sleep } from '../../helper';

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
		let sendCollateralAmount =
			orderParams.sizeUsd / Number(process.env.GMX_LEVERAGE);
		sendCollateralAmount = Math.round(sendCollateralAmount * 100) / 100;
		const parsedSendCollateralAmount = ethers.utils.parseUnits(
			String(sendCollateralAmount),
			usdcDecimal
		);

		await checkAndApprove(parsedSendCollateralAmount);

		const gmxContract = new ethers.Contract(
			exchangeRounter,
			ExchangeRouterAbi,
			signer
		);

		const [hasLongPosition, orderType, positionSizeUsd, collateralAmount] =
			await getOrderTypeAndPosition(
				orderParams.marketAddress,
				orderParams.isLong
			);

		let initialCollateralDeltaAmount = ethers.BigNumber.from(0);
		if (orderType === gmxOrderType.MarketDecrease) {
			let withdrawAmount =
				collateralAmount * (orderParams.sizeUsd / positionSizeUsd);
			withdrawAmount = Math.round(withdrawAmount * 100) / 100;

			initialCollateralDeltaAmount = ethers.utils.parseUnits(
				String(withdrawAmount),
				usdcDecimal
			);
		}

		const decreasePositionSwapType =
			orderType === gmxOrderType.MarketIncrease ? 0 : 1;
		const sizeDeltaUsd = ethers.utils.parseUnits(
			String(orderParams.sizeUsd),
			BASE_DECIMAL
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

		// construct multiCall
		const multiCallParams = [
			gmxContract.interface.encodeFunctionData('sendWnt', [
				orderVault,
				executionFee
			])
		];
		if (orderType == gmxOrderType.MarketIncrease) {
			multiCallParams.push(
				gmxContract.interface.encodeFunctionData('sendTokens', [
					usdc,
					orderVault,
					parsedSendCollateralAmount
				])
			);
		}
		multiCallParams.push(createOrderData);

		const tx = await gmxContract.multicall(multiCallParams, {
			value: executionFee,
			gasLimit: 20000000
		});
		console.log('Order created successfully:', tx);

		const receipt = await tx.wait();
		console.log('tx receipt', receipt);

		// if it's a decrease order, create another order with rest size
		if (
			orderType == gmxOrderType.MarketDecrease &&
			positionSizeUsd &&
			positionSizeUsd + 2 < orderParams.sizeUsd
		) {
			// wait actual first order is executed
			await _sleep(20000);

			const restOrderParams: gmxOrderParams = {
				marketAddress: orderParams.marketAddress,
				isLong: orderParams.isLong,
				sizeUsd: orderParams.sizeUsd - positionSizeUsd,
				price: orderParams.price
			};
			await gmxCreateOrder(restOrderParams);
		}

		return {
			txHash: tx.hash,
			sizeUsd: orderParams.sizeUsd,
			isLong: orderParams.isLong
		} as gmxOrderResult;
	} catch (error) {
		console.error(error);
		return;
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

export const getOrderTypeAndPosition = async (
	market: string,
	isLongOrder: boolean
): Promise<[boolean, gmxOrderType, number, number]> => {
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
	if (!position) return [null, gmxOrderType.MarketIncrease, null, null];

	// if it's the same order direction, marketIncrease order
	if ((hasLongPosition && isLongOrder) || (!hasLongPosition && !isLongOrder)) {
		return [hasLongPosition, gmxOrderType.MarketIncrease, null, null];
	} else {
		const positionSizeUsd = ethers.utils.formatUnits(
			String(position.numbers.sizeInUsd),
			BASE_DECIMAL
		);

		const collateralAmount = ethers.utils.formatUnits(
			String(position.numbers.collateralAmount),
			usdcDecimal
		);

		return [
			hasLongPosition,
			gmxOrderType.MarketDecrease,
			Number(positionSizeUsd),
			Number(collateralAmount)
		];
	}
};

export const getAcceptablePrice = (isLong: boolean, price: number) => {
	const slippage = 0.05;
	const multiplier = isLong ? 1 + slippage : 1 - slippage;
	return ethers.utils.parseUnits(String(price * multiplier), 22);

	// temporary fix
	// return isLong ? ethers.constants.MaxUint256 : 1;
};
