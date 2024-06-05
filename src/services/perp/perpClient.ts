import { AbstractDexClient } from '../abstractDexClient';
import { PerpetualProtocol, SupportedChainIds } from '@perp/sdk-curie';
import config = require('config');
import 'dotenv/config';
import { ethers } from 'ethers';
import { _sleep, doubleSizeIfReverseOrder } from '../../helper';
import Big from 'big.js';
import { constants, utils, Contract, Wallet } from 'ethers';
import { big2BigNumberAndScaleUp } from '@perp/sdk-curie';
import { clearingHouseAbi } from './abi/clearingHouse';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { PositionSide } from '@perp/sdk-curie';
import { AlertObject, OrderResult, perpOrderParams } from '../../types';

export class PerpClient extends AbstractDexClient {
	static async build() {
		if (!process.env.PERPETUAL_PRIVATE_KEY) {
			console.log(
				'PERPETUAL_PRIVATE_KEY for Perpetual Protocol is not set as environment variable'
			);
			return;
		}
		const rpcURL: string = config.get('Perpetual.Network.host');
		const perp = new PerpetualProtocol({
			chainId: SupportedChainIds.OPTIMISM,
			// chainId: SupportedChainIds.OPTIMISM_GOERLI,
			providerConfigs: [
				{
					rpcUrl: rpcURL
				}
			]
		});

		await perp.init();

		const provider = new ethers.providers.JsonRpcProvider(rpcURL);
		const signer = new ethers.Wallet(
			'0x' + process.env.PERPETUAL_PRIVATE_KEY,
			provider
		);
		await perp.connect({ signer });

		return perp;
	}

	getIsAccountReady = async () => {
		try {
			const perp = await PerpClient.build();
			if (!perp || !perp.wallet) return false;

			const balance = await perp.wallet.getBalanceEth();
			console.log(
				'Perpetual Protocol(Optimism) ETH balance: ',
				Number(balance)
			);

			return Number(balance) > 0;
		} catch (error) {
			console.error(error);
		}
	};

	placeOrder = async (alertMessage: AlertObject) => {
		const orderParams = await this.buildOrderParams(alertMessage);
		let count = 0;
		const maxTries = 3;
		while (count <= maxTries) {
			try {
				const perp = await PerpClient.build();
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

				// disable to avoid error for now
				// const maxPriorityFeePerGas = utils.parseUnits('0.001', 'gwei');
				// const tx = await clearingHouse.openPosition(orderArgs, {
				// 	maxPriorityFeePerGas
				// });
				const tx = await clearingHouse.openPosition(orderArgs);
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

				const orderResult: OrderResult = {
					orderId: txResult.transactionHash,
					size: positionDraft.amountInput.toNumber(),
					side: positionDraft.isBaseToQuote ? 'SELL' : 'BUY'
				};

				await this.exportOrder(
					'Perpetual',
					alertMessage.strategy,
					orderResult,
					alertMessage.price,
					alertMessage.market
				);

				return orderResult;
			} catch (error) {
				count++;

				console.error(error);

				await _sleep(5000);
			}
		}
	};

	buildOrderParams = async (alertMessage: AlertObject) => {
		const orderSide =
			alertMessage.order == 'buy' ? PositionSide.LONG : PositionSide.SHORT;

		let orderSize: number;
		if (alertMessage.sizeByLeverage) {
			const perp = await PerpClient.build();
			if (!perp || !perp.vault)
				throw Error('Perpetual Protocol Vault is not connected');

			const accountValue = await perp.vault.getAccountValue();
			orderSize =
				(Number(accountValue) * Number(alertMessage.sizeByLeverage)) /
				Number(alertMessage.price);
		} else if (alertMessage.sizeUsd) {
			orderSize = Number(alertMessage.sizeUsd) / Number(alertMessage.price);
		} else {
			orderSize = Number(alertMessage.size);
		}

		orderSize = doubleSizeIfReverseOrder(alertMessage, orderSize);

		const tickerSymbol = alertMessage.market.replace('_', '');
		const side = orderSide;

		const referralCode = process.env.PERPETUAL_REFERRAL_CODE
			? process.env.PERPETUAL_REFERRAL_CODE
			: '0xibuki';

		const orderParams: perpOrderParams = {
			tickerSymbol,
			side,
			amountInput: orderSize,
			isAmountInputBase: true,
			referralCode: referralCode
		};
		console.log('orderParams for Perpetual Protocol', orderParams);

		return orderParams;
	};
}
