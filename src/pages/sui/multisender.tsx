"use client";

import React, { useState, useEffect } from "react";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
	useCurrentAccount,
	useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import Sidebar2 from "../../components/sidebar";
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionBlock } from "@mysten/sui.js/transactions";

interface CoinBalance {
	coinType: string;
	totalBalance: string;
	coinObjectCount: number;
	lockedBalance: Record<string, string>;
}

const Multisender: React.FC = () => {
	const currentAccount = useCurrentAccount();
	const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
	const client = new SuiClient({ url: getFullnodeUrl("testnet") });
	const [recipients, setRecipients] = useState<string[]>([""]);
	const [amounts, setAmounts] = useState<number[]>([0]);
	const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse
	const [coins, setCoins] = useState<
		{
			coinType: string;
			coinObjectId: string;
			coinName: string;
			totalBalance: string;
			decimals: number;
		}[]
	>([]);
	const [selectedCoin, setSelectedCoin] = useState<string>("");
	const [selectedCoinType, setSelectedCoinType] = useState<string>("");
	const [selectedCoinDecimals, setSelectedCoinDecimals] = useState<number>(0);

	useEffect(() => {
		if (currentAccount) {
			fetchBalances(currentAccount.address);
		}
	}, [currentAccount]);

	const fetchBalances = async (ownerAddress: string) => {
		try {
			const balances: CoinBalance[] = await client.getAllBalances({
				owner: ownerAddress,
			});
			const coinsWithNames = await Promise.all(
				balances.map(async (balance) => {
					const coinDetails = await client.getCoinMetadata({
						coinType: balance.coinType,
					});
					if (coinDetails && coinDetails.id) {
						const coins = [];
						let result = null;
						let cursor = null;
						do {
							result = await client.getCoins({
								owner: ownerAddress,
								coinType: balance.coinType,
								limit: 50,
								cursor: cursor,
							});
							coins.push(...result.data);
							cursor = result.nextCursor;
						} while (result.hasNextPage);

						if (coins.length === 0) {
							console.error(`No coin object found for coin type: ${balance.coinType}`);
							return null;
						}

						const coinObjectId = coins[0].coinObjectId;
						const adjustedBalance = Number(balance.totalBalance) / Math.pow(10, coinDetails.decimals);

						return {
							coinType: balance.coinType,
							coinObjectId,
							coinName: coinDetails.name,
							totalBalance: adjustedBalance.toString(),
							decimals: coinDetails.decimals,
						};
					}
					return null;
				})
			);

			const validCoins = coinsWithNames.filter((coin) => coin !== null) as {
				coinType: string;
				coinObjectId: string;
				coinName: string;
				totalBalance: string;
				decimals: number;
			}[];

			setCoins(validCoins);
		} catch (e) {
			console.error("Failed to fetch balances:", e);
		}
	};

	const addRecipient = () => {
		setRecipients([...recipients, ""]);
		setAmounts([...amounts, 0]);
	};

	const updateRecipient = (index: number, value: string) => {
		const updatedRecipients = [...recipients];
		updatedRecipients[index] = value;
		setRecipients(updatedRecipients);
	};

	const updateAmount = (index: number, value: string) => {
		const updatedAmounts = [...amounts];
		const parsedValue = parseFloat(value);
		if (!isNaN(parsedValue)) {
			updatedAmounts[index] = parsedValue;
		} else {
			updatedAmounts[index] = 0;
		}
		setAmounts(updatedAmounts);
	};

	const sendToMultiple = async () => {
		if (!currentAccount) {
			toast.error("Please connect the wallet first");
			return;
		}

		if (!selectedCoin) {
			toast.error("Token object ID is required");
			return;
		}

		if (recipients.length === 0 || amounts.length === 0) {
			toast.error("Recipients and amounts are required");
			return;
		}

		try {
			toast.info("Sending tokens...");

			const scaledAmounts = amounts.map(amount => BigInt(amount * Math.pow(10, selectedCoinDecimals)));

			const txBlock = new TransactionBlock();
			txBlock.setGasBudget(10000000); // Ensure you have enough gas budget

			txBlock.moveCall({
				target: "0xdd2844cb4f7e5dfa9f4e4dd83f75af9e1ad5a5009c12f70c3d751f1e57ecf3b3::multisender::entry_send_to_multiple",
				arguments: [
					txBlock.object(selectedCoin),
					txBlock.pure(recipients, "vector<address>"),
					txBlock.pure(scaledAmounts, "vector<u64>"),
				],
				typeArguments: [selectedCoinType], // Use the actual coin type
			});

			const result = await signAndExecuteTransactionBlock.mutateAsync({
				transactionBlock: txBlock,
				options: {
					showObjectChanges: true,
					showEffects: true,
				},
				requestType: "WaitForLocalExecution",
			});

			console.log("Transaction result:", result);
			toast.success("Tokens sent successfully!");
		} catch (e) {
			console.error("Transaction error:", e);
			toast.error("Failed to send tokens.");
		}
	};

	return (
		<>
			<div className='flex'>
				<Sidebar2
					isCollapsed={isCollapsed}
					setIsCollapsed={setIsCollapsed}
				/>
				<div className='flex-1'>
					<div className='container mx-auto p-4 text-white'>
						<ToastContainer />
						<div className='flex justify-center items-center min-h-screen'>
							<div className='rounded-lg shadow-lg p-6 w-full max-w-md'>
								<h2 className='text-2xl font-semibold mb-4 text-center'>
									Send Tokens to Multiple Recipients
								</h2>
								<form className='space-y-8'>
									<div>
										<label className='block mb-2'>
											Select Coin
										</label>
										<Select
											onValueChange={(value) => {
												setSelectedCoin(value);
												const coin = coins.find((coin) => coin.coinObjectId === value);
												if (coin) {
													setSelectedCoinType(coin.coinType);
													setSelectedCoinDecimals(coin.decimals);
												}
											}}
											defaultValue=''
										>
											<SelectTrigger>
												<SelectValue placeholder='Select a coin' />
											</SelectTrigger>
											<SelectContent>
												{coins.map((coin) => (
													<SelectItem
														key={coin.coinObjectId}
														value={coin.coinObjectId}
													>
														{coin.coinName} - Balance: {coin.totalBalance}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<Button
											type='button'
											onClick={addRecipient}
											className='w-full bg-blue-600 text-white hover:bg-blue-700'
										>
											Add Recipient
										</Button>
									</div>
									{recipients.map((recipient, index) => (
										<div
											key={index}
											className='flex space-x-2'
										>
											<Input
												type='text'
												placeholder='Recipient Address'
												value={recipient}
												onChange={(e) =>
													updateRecipient(
														index,
														e.target.value
													)
												}
												className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
											/>
											<Input
												type='number'
												placeholder='Amount'
												value={amounts[index]}
												onChange={(e) =>
													updateAmount(
														index,
														e.target.value
													)
												}
												className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
											/>
										</div>
									))}
									<Button
										type='button'
										onClick={sendToMultiple}
										className='w-full bg-green-600 text-white hover:bg-green-700'
									>
										Send Tokens
									</Button>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Multisender;
