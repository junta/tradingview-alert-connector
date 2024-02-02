export const clearingHouseAbi = [
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'delegateApproval',
				type: 'address'
			}
		],
		name: 'DelegateApprovalChanged',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'trader',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'baseToken',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'fundingPayment',
				type: 'int256'
			}
		],
		name: 'FundingPaymentSettled',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'maker',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'baseToken',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'quoteToken',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'int24',
				name: 'lowerTick',
				type: 'int24'
			},
			{
				indexed: false,
				internalType: 'int24',
				name: 'upperTick',
				type: 'int24'
			},
			{ indexed: false, internalType: 'int256', name: 'base', type: 'int256' },
			{ indexed: false, internalType: 'int256', name: 'quote', type: 'int256' },
			{
				indexed: false,
				internalType: 'int128',
				name: 'liquidity',
				type: 'int128'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'quoteFee',
				type: 'uint256'
			}
		],
		name: 'LiquidityChanged',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'previousOwner',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'newOwner',
				type: 'address'
			}
		],
		name: 'OwnershipTransferred',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'account',
				type: 'address'
			}
		],
		name: 'Paused',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'trader',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'baseToken',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'exchangedPositionSize',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'exchangedPositionNotional',
				type: 'int256'
			},
			{ indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' },
			{
				indexed: false,
				internalType: 'int256',
				name: 'openNotional',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'realizedPnl',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'sqrtPriceAfterX96',
				type: 'uint256'
			}
		],
		name: 'PositionChanged',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'trader',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'baseToken',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'closedPositionSize',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'closedPositionNotional',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'openNotional',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'int256',
				name: 'realizedPnl',
				type: 'int256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'closedPrice',
				type: 'uint256'
			}
		],
		name: 'PositionClosed',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'trader',
				type: 'address'
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'baseToken',
				type: 'address'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'positionNotional',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'positionSize',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'liquidationFee',
				type: 'uint256'
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'liquidator',
				type: 'address'
			}
		],
		name: 'PositionLiquidated',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'referralCode',
				type: 'bytes32'
			}
		],
		name: 'ReferredPositionChanged',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'forwarder',
				type: 'address'
			}
		],
		name: 'TrustedForwarderChanged',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'trustedForwarder',
				type: 'address'
			}
		],
		name: 'TrustedForwarderUpdated',
		type: 'event'
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: false,
				internalType: 'address',
				name: 'account',
				type: 'address'
			}
		],
		name: 'Unpaused',
		type: 'event'
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'address', name: 'baseToken', type: 'address' },
					{ internalType: 'uint256', name: 'base', type: 'uint256' },
					{ internalType: 'uint256', name: 'quote', type: 'uint256' },
					{ internalType: 'int24', name: 'lowerTick', type: 'int24' },
					{ internalType: 'int24', name: 'upperTick', type: 'int24' },
					{ internalType: 'uint256', name: 'minBase', type: 'uint256' },
					{ internalType: 'uint256', name: 'minQuote', type: 'uint256' },
					{ internalType: 'bool', name: 'useTakerBalance', type: 'bool' },
					{ internalType: 'uint256', name: 'deadline', type: 'uint256' }
				],
				internalType: 'struct IClearingHouse.AddLiquidityParams',
				name: 'params',
				type: 'tuple'
			}
		],
		name: 'addLiquidity',
		outputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'base', type: 'uint256' },
					{ internalType: 'uint256', name: 'quote', type: 'uint256' },
					{ internalType: 'uint256', name: 'fee', type: 'uint256' },
					{ internalType: 'uint256', name: 'liquidity', type: 'uint256' }
				],
				internalType: 'struct IClearingHouse.AddLiquidityResponse',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'maker', type: 'address' },
			{ internalType: 'address', name: 'baseToken', type: 'address' }
		],
		name: 'cancelAllExcessOrders',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'maker', type: 'address' },
			{ internalType: 'address', name: 'baseToken', type: 'address' },
			{ internalType: 'bytes32[]', name: 'orderIds', type: 'bytes32[]' }
		],
		name: 'cancelExcessOrders',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'candidate',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'address', name: 'baseToken', type: 'address' },
					{
						internalType: 'uint160',
						name: 'sqrtPriceLimitX96',
						type: 'uint160'
					},
					{
						internalType: 'uint256',
						name: 'oppositeAmountBound',
						type: 'uint256'
					},
					{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
					{ internalType: 'bytes32', name: 'referralCode', type: 'bytes32' }
				],
				internalType: 'struct IClearingHouse.ClosePositionParams',
				name: 'params',
				type: 'tuple'
			}
		],
		name: 'closePosition',
		outputs: [
			{ internalType: 'uint256', name: 'base', type: 'uint256' },
			{ internalType: 'uint256', name: 'quote', type: 'uint256' }
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getAccountBalance',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
		name: 'getAccountValue',
		outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getClearingHouseConfig',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getDelegateApproval',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getExchange',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getInsuranceFund',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getOrderBook',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getQuoteToken',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getTrustedForwarder',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getUniswapV3Factory',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'getVault',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'clearingHouseConfigArg',
				type: 'address'
			},
			{ internalType: 'address', name: 'vaultArg', type: 'address' },
			{ internalType: 'address', name: 'quoteTokenArg', type: 'address' },
			{ internalType: 'address', name: 'uniV3FactoryArg', type: 'address' },
			{ internalType: 'address', name: 'exchangeArg', type: 'address' },
			{ internalType: 'address', name: 'accountBalanceArg', type: 'address' },
			{ internalType: 'address', name: 'insuranceFundArg', type: 'address' }
		],
		name: 'initialize',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }],
		name: 'isTrustedForwarder',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'trader', type: 'address' },
			{ internalType: 'address', name: 'baseToken', type: 'address' },
			{ internalType: 'int256', name: 'positionSize', type: 'int256' }
		],
		name: 'liquidate',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'trader', type: 'address' },
			{ internalType: 'address', name: 'baseToken', type: 'address' }
		],
		name: 'liquidate',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'address', name: 'baseToken', type: 'address' },
					{ internalType: 'bool', name: 'isBaseToQuote', type: 'bool' },
					{ internalType: 'bool', name: 'isExactInput', type: 'bool' },
					{ internalType: 'uint256', name: 'amount', type: 'uint256' },
					{
						internalType: 'uint256',
						name: 'oppositeAmountBound',
						type: 'uint256'
					},
					{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
					{
						internalType: 'uint160',
						name: 'sqrtPriceLimitX96',
						type: 'uint160'
					},
					{ internalType: 'bytes32', name: 'referralCode', type: 'bytes32' }
				],
				internalType: 'struct IClearingHouse.OpenPositionParams',
				name: 'params',
				type: 'tuple'
			}
		],
		name: 'openPosition',
		outputs: [
			{ internalType: 'uint256', name: 'base', type: 'uint256' },
			{ internalType: 'uint256', name: 'quote', type: 'uint256' }
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'trader', type: 'address' },
			{
				components: [
					{ internalType: 'address', name: 'baseToken', type: 'address' },
					{ internalType: 'bool', name: 'isBaseToQuote', type: 'bool' },
					{ internalType: 'bool', name: 'isExactInput', type: 'bool' },
					{ internalType: 'uint256', name: 'amount', type: 'uint256' },
					{
						internalType: 'uint256',
						name: 'oppositeAmountBound',
						type: 'uint256'
					},
					{ internalType: 'uint256', name: 'deadline', type: 'uint256' },
					{
						internalType: 'uint160',
						name: 'sqrtPriceLimitX96',
						type: 'uint160'
					},
					{ internalType: 'bytes32', name: 'referralCode', type: 'bytes32' }
				],
				internalType: 'struct IClearingHouse.OpenPositionParams',
				name: 'params',
				type: 'tuple'
			}
		],
		name: 'openPositionFor',
		outputs: [
			{ internalType: 'uint256', name: 'base', type: 'uint256' },
			{ internalType: 'uint256', name: 'quote', type: 'uint256' },
			{ internalType: 'uint256', name: 'fee', type: 'uint256' }
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'owner',
		outputs: [{ internalType: 'address', name: '', type: 'address' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [],
		name: 'pause',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'paused',
		outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'trader', type: 'address' },
			{ internalType: 'address', name: 'baseToken', type: 'address' }
		],
		name: 'quitMarket',
		outputs: [
			{ internalType: 'uint256', name: 'base', type: 'uint256' },
			{ internalType: 'uint256', name: 'quote', type: 'uint256' }
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{
				components: [
					{ internalType: 'address', name: 'baseToken', type: 'address' },
					{ internalType: 'int24', name: 'lowerTick', type: 'int24' },
					{ internalType: 'int24', name: 'upperTick', type: 'int24' },
					{ internalType: 'uint128', name: 'liquidity', type: 'uint128' },
					{ internalType: 'uint256', name: 'minBase', type: 'uint256' },
					{ internalType: 'uint256', name: 'minQuote', type: 'uint256' },
					{ internalType: 'uint256', name: 'deadline', type: 'uint256' }
				],
				internalType: 'struct IClearingHouse.RemoveLiquidityParams',
				name: 'params',
				type: 'tuple'
			}
		],
		name: 'removeLiquidity',
		outputs: [
			{
				components: [
					{ internalType: 'uint256', name: 'base', type: 'uint256' },
					{ internalType: 'uint256', name: 'quote', type: 'uint256' },
					{ internalType: 'uint256', name: 'fee', type: 'uint256' }
				],
				internalType: 'struct IClearingHouse.RemoveLiquidityResponse',
				name: '',
				type: 'tuple'
			}
		],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'renounceOwnership',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'address', name: 'delegateApprovalArg', type: 'address' }
		],
		name: 'setDelegateApproval',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
		name: 'setOwner',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
		name: 'settleAllFunding',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'uint256', name: 'amount0Owed', type: 'uint256' },
			{ internalType: 'uint256', name: 'amount1Owed', type: 'uint256' },
			{ internalType: 'bytes', name: 'data', type: 'bytes' }
		],
		name: 'uniswapV3MintCallback',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [
			{ internalType: 'int256', name: 'amount0Delta', type: 'int256' },
			{ internalType: 'int256', name: 'amount1Delta', type: 'int256' },
			{ internalType: 'bytes', name: 'data', type: 'bytes' }
		],
		name: 'uniswapV3SwapCallback',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'unpause',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'updateOwner',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function'
	},
	{
		inputs: [],
		name: 'versionRecipient',
		outputs: [{ internalType: 'string', name: '', type: 'string' }],
		stateMutability: 'pure',
		type: 'function'
	}
];
