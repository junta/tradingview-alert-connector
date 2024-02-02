import { perpOrderParams } from '../../types';
import { _sleep } from '../../helper';
import PerpetualConnector from './client';
import Big from 'big.js';
import config = require('config');
import { constants, utils, Contract, Wallet } from 'ethers';
import { big2BigNumberAndScaleUp } from '@perp/sdk-curie';
import { clearingHouseAbi } from './abi/clearingHouse';
import { StaticJsonRpcProvider } from '@ethersproject/providers';

export const perpCreateOrder = async (orderParams: perpOrderParams) => {
	let count = 0;
	const maxTries = 3;
	while (count <= maxTries) {
		try {
			const perp = await PerpetualConnector.build();
			if (!perp || !perp.clearingHouse) return;

			const rpcURL: string = config.get('Perpetual.Network.host');
			const provider = new StaticJsonRpcProvider(rpcURL);
			const wallet = new Wallet(
				'0x' + process.env.PERPETUAL_PRIVATE_KEY,
				provider
			);
			const clearingHouse = new Contract(
				'0x82ac2CE43e33683c58BE4cDc40975E73aA50f459',
				clearingHouseAbi,
				wallet
			);

			const maxPriorityFeePerGas = utils.parseUnits('0.001', 'gwei');

			const positionDraft = perp.clearingHouse.createPositionDraft({
				tickerSymbol: orderParams.tickerSymbol,
				side: orderParams.side,
				amountInput: new Big(orderParams.amountInput),
				isAmountInputBase: orderParams.isAmountInputBase
			});
			const referralCodeAsBytes = orderParams.referralCode
				? utils.formatBytes32String(orderParams.referralCode)
				: constants.HashZero;

			const slippage = new Big(config.get('Perpetual.User.slippage'));
			const oppositeAmountBound = await positionDraft.getOppositeAmountBound(
				slippage
			);
			const orderArgs = {
				baseToken: positionDraft.market.baseAddress,
				isBaseToQuote: positionDraft.isBaseToQuote,
				isExactInput: positionDraft.isExactInput,
				amount: big2BigNumberAndScaleUp(positionDraft.amountInput),
				oppositeAmountBound: big2BigNumberAndScaleUp(oppositeAmountBound),
				sqrtPriceLimitX96: 0, // NOTE: this is for partial filled, disable by giving zero.
				deadline: constants.MaxUint256, // NOTE: not important yet
				referralCode: referralCodeAsBytes
			};

			const tx = await clearingHouse.openPosition(orderArgs, {
				maxPriorityFeePerGas
			});
			const txResult = await tx.wait();

			console.log(txResult);

			console.log(
				new Date() + ' placed order market:',
				orderParams.tickerSymbol,
				'side:',
				orderParams.side,
				'size:',
				orderParams.amountInput
			);

			return {
				amount: positionDraft.amountInput,
				isBaseToQuote: positionDraft.isBaseToQuote,
				txHash: txResult.transactionHash
			};
		} catch (error) {
			count++;

			console.error(error);

			await _sleep(5000);
		}
	}
};
