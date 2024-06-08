"use client";
import React, { useState, useEffect } from "react";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectItem,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	useCurrentAccount,
	useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { useForm, Controller } from "react-hook-form";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import {
	convertToMilliseconds,
	convertTo24HourFormat,
} from "../../lib/calculations";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import axios from "axios";
import Sidebar2 from "../../components/sidebar";
import { useNetwork } from '../../components/NetworkContext'; // Adjust the path as necessary


const formSchema = z.object({
	investorName: z.string().min(1, "Investor Name is required"),
	startDate: z.date().nullable(), // allow null but required
	startHour: z.preprocess((val) => Number(val), z.number().min(1).max(12)),
	startMinute: z.preprocess((val) => Number(val), z.number().min(0).max(59)),
	startPeriod: z.enum(["AM", "PM"]),
	duration: z.preprocess((val) => Number(val), z.number().min(1)),
	durationUnit: z.enum(["minutes", "hours", "days"]),
	claimInterval: z.preprocess((val) => Number(val), z.number().min(1)),
	claimIntervalUnit: z.enum(["minutes", "hours", "days"]),
	receiver: z.string().min(1),
	amount: z.preprocess((val) => Number(val), z.number().min(1)),
	transferPercentage: z.preprocess(
		(val) => Number(val),
		z.number().min(0).max(100)
	),
	coin: z.string().min(1),
});

interface FormData {
	startDate: Date | null;
	startHour: number;
	startMinute: number;
	startPeriod: string;
	duration: number;
	durationUnit: string;
	claimInterval: number;
	claimIntervalUnit: string;
	receiver: string;
	amount: number;
	transferPercentage: number;
	coin: string;
	investorName: string; // Add this field
}

interface CoinBalance {
	coinType: string;
	totalBalance: string;
	coinObjectCount: number;
	lockedBalance: Record<string, string>;
}

// interface CoinMetadata {
// 	decimals: number;
// 	description: string;
// 	iconUrl?: null | string;
// 	id?: null | string;
// 	name: string;
// 	symbol: string;
// }

const Create: React.FC = () => {
	const api = "http://localhost:8000/api";
	// console.log(api)
	const currentAccount = useCurrentAccount();
	const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
	const { control, handleSubmit, ...formMethods } = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			startDate: null,
			startHour: 1,
			startMinute: 0,
			startPeriod: "AM",
			duration: 1,
			durationUnit: "days",
			claimInterval: 1,
			claimIntervalUnit: "days",
			receiver: "",
			amount: 1,
			transferPercentage: 0,
			coin: "",
			investorName: "", // Add investorName to defaultValues
		},
	});

	const [digest, setDigest] = useState("");
	const [coins, setCoins] = useState<
		{
			coinType: string;
			coinObjectId: string;
			coinName: string;
			totalBalance: string;
		}[]
	>([]);
	const [, setSelectedCoin] = useState("");
	const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse

	const { network } = useNetwork(); // Use selectedNetwork from context
	const client = new SuiClient({ url: getFullnodeUrl(network) });

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
					console.log("balance:", balance);
					console.log("coinDetails:", coinDetails);
					console.log("balance.coinType:", balance.coinType);

					// Log the coinType
					console.log("coinType:", balance.coinType);

					// Ensure coinDetails and coinDetails.id are valid
					if (coinDetails && coinDetails.id) {
						// Fetching coin objects using the getCoins method
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

						console.log("Fetched coins:", coins);

						if (coins.length === 0) {
							console.error(
								`No coin object found for coin type: ${balance.coinType}`
							);
							return null;
						}

						// Use the first coin object ID found
						const coinObjectId = coins[0].coinObjectId;

						// Adjust balance using decimals
						const adjustedBalance =
							Number(balance.totalBalance) /
							Math.pow(10, coinDetails.decimals);

						return {
							coinType: balance.coinType,
							coinObjectId, // Use the actual coin object ID
							coinName: coinDetails.name,
							totalBalance: adjustedBalance.toString(),
						};
					}
					return null; // Return null if coinDetails or coinDetails.id is invalid
				})
			);

			// Filter out any null values
			const validCoins = coinsWithNames.filter(
				(coin) => coin !== null
			) as {
				coinType: string;
				coinObjectId: string;
				coinName: string;
				totalBalance: string;
			}[];

			setCoins(validCoins);
		} catch (e) {
			console.error("Failed to fetch balances:", e);
		}
	};

	const fetchCoinDetails = async (objectId: string) => {
		try {
			console.log(
				`Fetching details for coin with object ID: ${objectId}`
			);
			const response = await client.getObject({ id: objectId });
			console.log(`Fetched coin details:`, response.data);
			return response.data;
		} catch (e) {
			console.error("Failed to fetch coin details:", e);
			return null;
		}
	};

	const onSubmit = async (data: FormData) => {
		if (!currentAccount) {
			toast.error("Please connect the wallet first");
			return;
		}

		const {
			startDate,
			startHour,
			startMinute,
			startPeriod,
			duration,
			durationUnit,
			claimInterval,
			claimIntervalUnit,
			receiver,
			investorName,
			amount,
			transferPercentage,
			coin,
		} = data;
		console.log(investorName);
		console.log("Form data:", data);

		if (!startDate) {
			console.error("Start date is not set");
			return;
		}

		const startHour24 = convertTo24HourFormat(startHour, startPeriod);
		startDate.setHours(startHour24, startMinute, 0, 0);
		const startTimeMs = startDate.getTime();

		if (startTimeMs < Date.now()) {
			console.error("Start time is in the past");
			return;
		}

		const scaledAmount = BigInt(amount * 1_000_000_000); // Adjust this scaling factor based on the token's decimals
		const scaledDuration = BigInt(
			convertToMilliseconds(duration, durationUnit)
		);
		const scaledClaimInterval = BigInt(
			convertToMilliseconds(claimInterval, claimIntervalUnit)
		);
		const startTimeMsBigInt = BigInt(startTimeMs);

		const txBlock = new TransactionBlock();
		txBlock.setGasBudget(10000000);

		const gasCoin = coins.find((c) => c.coinObjectId !== coin);
		console.log("Selected gas coin:", gasCoin);
		if (!gasCoin) {
			console.error("No valid gas coin found");
			return;
		}

		const gasCoinDetails = await fetchCoinDetails(gasCoin.coinObjectId);
		console.log("Gas coin details:", gasCoinDetails);
		if (
			!gasCoinDetails ||
			!gasCoinDetails.objectId ||
			!gasCoinDetails.version ||
			!gasCoinDetails.digest
		) {
			console.error("Invalid gas coin data:", gasCoinDetails);
			return;
		}

		const {
			objectId: gasObjectId,
			version: gasVersion,
			digest: gasDigest,
		} = gasCoinDetails;

		const tokenDetails = await fetchCoinDetails(coin);
		console.log("Token coin details:", tokenDetails);
		if (
			!tokenDetails ||
			!tokenDetails.objectId ||
			!tokenDetails.version ||
			!tokenDetails.digest
		) {
			console.error("Invalid token coin data:", tokenDetails);
			return;
		}

		const selectedCoinType = coins.find(
			(c) => c.coinObjectId === coin
		)?.coinType;
		console.log("Selected coin type:", selectedCoinType);
		if (!selectedCoinType) {
			console.error("Selected coin type not found");
			return;
		}

		console.log("Coin object ID:", coin);

		console.log("Setting gas payment with:", {
			objectId: gasObjectId,
			version: gasVersion,
			digest: gasDigest,
		});
		txBlock.setGasPayment([
		  { objectId: gasObjectId, version: gasVersion, digest: gasDigest },
		]);

		// 0x4afa11807187e5c657ffba3b552fdbb546d6e496ee5591dca919c99dd48d3f27 Testnet package ID for Torque Protocol
		txBlock.setGasBudget(100000000);
		txBlock.moveCall({
			target: "0x55a00fa668b4f75bb719a63b9c1a6db172f393a05e9d5c6479aa40a872d12702::torqueprotocol::entry_new",
			arguments: [
				txBlock.object(coin), // Use the mutable coin object ID
				txBlock.pure(scaledAmount, "u64"),
				txBlock.pure(transferPercentage, "u64"),
				txBlock.object(
					"0x0000000000000000000000000000000000000000000000000000000000000006"
				), // Assuming this is the Clock object
				txBlock.pure(startTimeMsBigInt, "u64"),
				txBlock.pure(scaledDuration, "u64"),
				txBlock.pure(scaledClaimInterval, "u64"),
				txBlock.pure(receiver, "address"),
			],
			typeArguments: [selectedCoinType], // Add coinType to typeArguments
		});

		try {
			const result = await signAndExecuteTransactionBlock.mutateAsync({
				transactionBlock: txBlock,
				options: {
					showObjectChanges: true,
					showEffects: true,
				},
				requestType: "WaitForLocalExecution",
			});
			console.log("Transaction result:", result);
			setDigest(result.digest);
			toast.success("Transaction successful!");

			// API Call with Axios
			try {
				// await axios.get("/api/Vesting");
				const response = await axios.post(
					`${api}/vesting/createVesting`,
					{
						...data,
						digest: result.digest,
					},
					{
						headers: {
							"Content-Type": "application/json",
						},
					}
				);

				const apiResult = response.data;
				console.log("API response:", apiResult);

				if (response.status === 200) {
					console.log("API call succeeded:", apiResult.message);
				} else {
					console.error("API call failed:", apiResult.message);
				}
			} catch (apiError) {
				console.error("API Error:", apiError);
			}
		} catch (e) {
			console.error("Transaction error:", e);
			toast.error("Transaction failed.");
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
					<div className='container mx-auto p-4 text-white '>
						<ToastContainer />
						<div className='flex justify-center items-center min-h-screen'>
							<div className=' rounded-lg shadow-lg p-6 w-full max-w-md'>
								<h2 className='text-2xl font-semibold mb-4 text-center'>
									CREATE VESTING
								</h2>
								<Form
									{...formMethods}
									handleSubmit={handleSubmit}
									control={control}>
									<form
										onSubmit={handleSubmit(onSubmit)}
										className='space-y-8'>
										<FormField
											control={control}
											name='investorName'
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Enter the investor's
														name.
													</FormLabel>
													<FormControl>
														<Input
															type='text'
															{...field}
															className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
														/>
													</FormControl>
													<FormDescription>
														Enter the receiver
														address.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										{/* <FormItem>
											<FormLabel>Investor Name</FormLabel>
											<FormControl>
												<Input
													type='text'
													className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
												/>
											</FormControl>
											<FormDescription>
												Enter the investor's name.
											</FormDescription>
											<FormMessage />
										</FormItem> */}

										<FormField
											control={control}
											name='startDate'
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Start Date
													</FormLabel>
													<FormControl>
														<Popover>
															<PopoverTrigger
																asChild>
																<Button
																	variant={
																		"outline"
																	}
																	className={cn(
																		"w-[400px] pl-6 justify-start text-left font-normal",
																		!field.value &&
																			"text-muted-foreground"
																	)}>
																	<CalendarIcon className='mr-2 h-4 w-4' />
																	{field.value ? (
																		format(
																			field.value,
																			"PPP"
																		)
																	) : (
																		<span>
																			Pick
																			a
																			date
																		</span>
																	)}
																</Button>
															</PopoverTrigger>
															<PopoverContent className='w-auto p-0'>
																<Calendar
																	mode='single'
																	selected={
																		field.value ||
																		undefined
																	}
																	onSelect={(
																		date
																	) =>
																		field.onChange(
																			date
																		)
																	}
																	initialFocus
																/>
															</PopoverContent>
														</Popover>
													</FormControl>
													<FormDescription>
														Select the start date
														for the vesting.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='startHour'
											render={() => (
												<>
													<FormField
														control={control}
														name='coin'
														render={({ field }) => (
															<FormItem>
																<FormLabel>
																	Select Coin
																</FormLabel>
																<FormControl>
																	<Select
																		onValueChange={(
																			value
																		) => {
																			field.onChange(
																				value
																			);
																			setSelectedCoin(
																				value
																			);
																		}}
																		defaultValue=''>
																		<SelectTrigger>
																			<SelectValue placeholder='Select a coin' />
																		</SelectTrigger>
																		<SelectContent>
																			{coins.map(
																				(
																					coin
																				) => (
																					<SelectItem
																						key={
																							coin.coinObjectId
																						}
																						value={
																							coin.coinObjectId
																						}>
																						{
																							coin.coinName
																						}{" "}
																						-
																						Balance:{" "}
																						{
																							coin.totalBalance
																						}
																					</SelectItem>
																				)
																			)}
																		</SelectContent>
																	</Select>
																</FormControl>
																<FormDescription>
																	Select the
																	coin for
																	vesting.
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormItem>
														<FormLabel>
															Start Hour
														</FormLabel>
														<FormControl>
															<Controller
																name='startHour'
																control={
																	control
																}
																render={({
																	field,
																}) => (
																	<Input
																		type='number'
																		{...field}
																		value={
																			field.value ||
																			""
																		}
																		onChange={(
																			e
																		) =>
																			field.onChange(
																				parseInt(
																					e
																						.target
																						.value,
																					10
																				)
																			)
																		}
																		min={1}
																		max={12}
																		className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																	/>
																)}
															/>
														</FormControl>
														<FormDescription>
															Enter the start hour
															(1-12).
														</FormDescription>
														<FormMessage />
													</FormItem>
												</>
											)}
										/>
										<FormField
											control={control}
											name='startPeriod'
											render={({ field }) => (
												<FormItem>
													<FormLabel>AM/PM</FormLabel>
													<FormControl>
														<Select
															onValueChange={
																field.onChange
															}
															defaultValue={
																field.value
															}>
															<SelectTrigger>
																<SelectValue placeholder='Select period' />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value='AM'>
																	AM
																</SelectItem>
																<SelectItem value='PM'>
																	PM
																</SelectItem>
															</SelectContent>
														</Select>
													</FormControl>
													<FormDescription>
														Select AM or PM.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='startMinute'
											render={() => (
												<FormItem>
													<FormLabel>
														Start Minute
													</FormLabel>
													<FormControl>
														<Controller
															name='startMinute'
															control={control}
															render={({
																field,
															}) => (
																<Input
																	type='number'
																	{...field}
																	value={
																		field.value ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		field.onChange(
																			parseInt(
																				e
																					.target
																					.value,
																				10
																			)
																		)
																	}
																	min={0}
																	max={59}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>
														Enter the start minute
														(0-59).
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='duration'
											render={() => (
												<FormItem>
													<FormLabel>
														Duration
													</FormLabel>
													<FormControl>
														<Controller
															name='duration'
															control={control}
															render={({
																field,
															}) => (
																<Input
																	type='number'
																	{...field}
																	value={
																		field.value ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		field.onChange(
																			parseInt(
																				e
																					.target
																					.value,
																				10
																			)
																		)
																	}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>
														Enter the duration of
														the vesting period.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='durationUnit'
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Duration Unit
													</FormLabel>
													<FormControl>
														<Select
															onValueChange={
																field.onChange
															}
															defaultValue={
																field.value
															}>
															<SelectTrigger>
																<SelectValue placeholder='Select duration unit' />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value='minutes'>
																	Minutes
																</SelectItem>
																<SelectItem value='hours'>
																	Hours
																</SelectItem>
																<SelectItem value='days'>
																	Days
																</SelectItem>
															</SelectContent>
														</Select>
													</FormControl>
													<FormDescription>
														Select the unit of
														duration.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='claimInterval'
											render={() => (
												<FormItem>
													<FormLabel>
														Claim Interval
													</FormLabel>
													<FormControl>
														<Controller
															name='claimInterval'
															control={control}
															render={({
																field,
															}) => (
																<Input
																	type='number'
																	{...field}
																	value={
																		field.value ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		field.onChange(
																			parseInt(
																				e
																					.target
																					.value,
																				10
																			)
																		)
																	}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>
														Enter the interval for
														claims.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='claimIntervalUnit'
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Claim Interval Unit
													</FormLabel>
													<FormControl>
														<Select
															onValueChange={
																field.onChange
															}
															defaultValue={
																field.value
															}>
															<SelectTrigger>
																<SelectValue placeholder='Select interval unit' />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value='minutes'>
																	Minutes
																</SelectItem>
																<SelectItem value='hours'>
																	Hours
																</SelectItem>
																<SelectItem value='days'>
																	Days
																</SelectItem>
															</SelectContent>
														</Select>
													</FormControl>
													<FormDescription>
														Select the unit of the
														claim interval.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='receiver'
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														Receiver Address
													</FormLabel>
													<FormControl>
														<Input
															type='text'
															{...field}
															className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
														/>
													</FormControl>
													<FormDescription>
														Enter the receiver
														address.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='amount'
											render={() => (
												<FormItem>
													<FormLabel>
														Amount
													</FormLabel>
													<FormControl>
														<Controller
															name='amount'
															control={control}
															render={({
																field,
															}) => (
																<Input
																	type='number'
																	{...field}
																	value={
																		field.value ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		field.onChange(
																			parseInt(
																				e
																					.target
																					.value,
																				10
																			)
																		)
																	}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>
														Enter the amount to be
														vested.
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='transferPercentage'
											render={() => (
												<FormItem>
													<FormLabel>
														TGE Percentage
													</FormLabel>
													<FormControl>
														<Controller
															name='transferPercentage'
															control={control}
															render={({
																field,
															}) => (
																<Input
																	type='number'
																	{...field}
																	value={
																		field.value ||
																		""
																	}
																	onChange={(
																		e
																	) =>
																		field.onChange(
																			parseInt(
																				e
																					.target
																					.value,
																				10
																			)
																		)
																	}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																	placeholder='Enter percentage (0-100)'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>
														Enter the immediate
														transfer percentage
														(0-100).
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<Button
											type='submit'
											className='bg-blue-600 text-white hover:bg-blue-700'
											// onClick={handleSubmit}
										>
											Create Vesting
										</Button>
										<div className='mt-4'>
											<p className=' text-gray-400 text-xs'>
												Digest: {digest}
											</p>
										</div>
									</form>
								</Form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Create;
