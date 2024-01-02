import { ExchangeRouterAbi } from './abi/exchangeRounter';
import { ethers } from 'ethers';
import { decimalToFloat } from './math';
import { gmxOrderParams } from '../../types';
import { erc20Abi } from './abi/erc20';
import { getGmxClient } from './client';

// mainnet
const exchangeRounter = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const transferRouter = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
// testnet
// const gmxContractAddress = '';

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

		// mainnet
		const multiCallParams = [
			gmxContract.interface.encodeFunctionData('sendWnt', [
				orderVault,
				executionFee
			]),
			gmxContract.interface.encodeFunctionData('sendTokens', [
				usdc,
				orderVault,
				parsedSizeUsd
			]),
			gmxContract.interface.encodeFunctionData('createOrder', [
				{
					addresses: {
						receiver: signer.address,
						callbackContract: '0x0000000000000000000000000000000000000000',
						uiFeeReceiver: '0x0000000000000000000000000000000000000000',
						market: orderParams.marketAddress,
						initialCollateralToken: usdc,
						swapPath: []
					},
					numbers: {
						sizeDeltaUsd: decimalToFloat(orderParams.sizeUsd),
						initialCollateralDeltaAmount: 0,
						triggerPrice: 0,
						// TODO: check if correctly set
						acceptablePrice: decimalToFloat(
							Math.floor(orderParams.price * 1.05)
						),
						executionFee,
						callbackGasLimit: 0,
						minOutputAmount: 0
					},
					orderType: orderParams.orderType,
					decreasePositionSwapType: 0,
					isLong: orderParams.isLong,
					shouldUnwrapNativeToken: false,
					referralCode: 'tv_alert_connector'
				}
			])
		];

		const tx = await gmxContract.callStatic.multicall(multiCallParams, {
			value: executionFee,
			gasLimit: 20000000
		});

		// const tx = await gmxContract.multicall(multiCallParams, {
		// 	value: executionFee,
		// 	gasLimit: 20000000
		// });

		// const receipt = await tx.wait();

		console.log('Order created successfully:', tx);
		// console.log(receipt);
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
