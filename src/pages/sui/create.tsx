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
import Papa from "papaparse"; // CSV parsing library
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
import { useNetwork } from '../../components/NetworkContext';
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutHeader } from '@/components/custom/layout';

const formSchema = z.object({
	startDate: z.date().nullable(),
	startTime: z.string().min(1, "Start Time is required"),
	duration: z.preprocess((val) => Number(val), z.number().min(1)),
	durationUnit: z.enum(["minutes", "hours", "days"]),
	claimInterval: z.preprocess((val) => Number(val), z.number().min(1)),
	claimIntervalUnit: z.enum(["minutes", "hours", "days"]),
	receiver: z.string().min(1),
	amount: z.preprocess((val) => Number(val), z.number().min(1)).optional(),
	transferPercentage: z.preprocess((val) => Number(val), z.number().min(0).max(100)),
	coin: z.string().min(1),
	renouncementStart: z.date().nullable(),
	renouncementStartTime: z.string().min(1, "Renouncement Start Time is required"),
	renouncementEnd: z.date().nullable(),
	renouncementEndTime: z.string().min(1, "Renouncement End Time is required"),
	immediateClaimStart: z.date().nullable(), // New field for immediate claim start date
	immediateClaimStartTime: z.string().min(1, "Immediate Claim Start Time is required"), // New field for immediate claim start time
});


interface FormData {
	startDate: Date | null;
	startTime: string; 
	duration: number;
	durationUnit: string;
	claimInterval: number;
	claimIntervalUnit: string;
	receiver?: string;
	amount?: number;
	transferPercentage: number;
	coin: string;
	renouncementStart: Date | null;
	renouncementStartTime: string; // New field for renouncement start time
	renouncementEnd: Date | null;
	renouncementEndTime: string; // New field for renouncement end time
	immediateClaimStart: Date | null; // New field for immediate claim start date
	immediateClaimStartTime: string; // New field for immediate claim start time
}

interface CsvData {
	receiverAddress: string;
	amount: number;
}

interface CoinBalance {
	coinType: string;
	totalBalance: string;
	coinObjectCount: number;
	lockedBalance: Record<string, string>;
}

const Create: React.FC = () => {
	const api = "http://localhost:8000/api";
	const currentAccount = useCurrentAccount();
	const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
	const { control, handleSubmit, ...formMethods } = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			startDate: new Date(),
			startTime: "12:00 PM",
			duration: 30,
			durationUnit: "days",
			claimInterval: 5,
			claimIntervalUnit: "days",
			receiver: "0xb18ead1e8c7737dd438b1a618fc4f977c1c7f3685a5cf83abd56d3cd2bf4f484", // Default value for Receiver Address
			amount: 1, // Default value for Amount
			transferPercentage: 0, // Default value for TGE Percentage
			coin: "",
			renouncementStart: new Date(),
			renouncementEnd: new Date(new Date().setMonth(new Date().getMonth() + 6)),
			immediateClaimStart: new Date(), // Default to today
		},
	});
	

	const [digest, setDigest] = useState("");
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
	const [selectedCoinDecimals, setSelectedCoinDecimals] = useState<number>(0);
	const [csvData, setCsvData] = useState<CsvData[]>([]);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isRejected, setIsRejected] = useState(false);
	const ADMIN_CAP_OBJECT_ID = "0xfddc475a9f91eabe3d473a975df3950b1acf952d37682ccfcc09981227ff0e3d";

	const { network } = useNetwork();
	const client = new SuiClient({ url: getFullnodeUrl(network) });

	const seedifyProtocolAddress = network === 'mainnet'
		? import.meta.env.VITE_MAINNET_SEEDIFY_ADDRESS
		: import.meta.env.VITE_TESTNET_SEEDIFY_ADDRESS;

	useEffect(() => {
		if (currentAccount) {
			fetchBalances(currentAccount.address);
		}
	}, [currentAccount, network]);

	useEffect(() => {
		console.log("Selected coin:", selectedCoin);
	}, [selectedCoin]);

	useEffect(() => {
		return () => {
			setCsvData([]);
		};
	}, []);

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
						console.log(`Fetched decimals for ${coinDetails.name}: ${coinDetails.decimals}`);
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
							console.error(
								`No coin object found for coin type: ${balance.coinType}`
							);
							return null;
						}

						const coinObjectId = coins[0].coinObjectId;
						const adjustedBalance =
							Number(balance.totalBalance) /
							Math.pow(10, coinDetails.decimals);

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

			const validCoins = coinsWithNames.filter(
				(coin) => coin !== null
			) as {
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

	const fetchCoinDetails = async (objectId: string) => {
		try {
			const response = await client.getObject({ id: objectId });
			console.log("Fetched coin details:", response.data);
			return response.data;
		} catch (e) {
			console.error("Failed to fetch coin details:", e);
			return null;
		}
	};

	const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			Papa.parse<CsvData>(file, {
				header: true,
				dynamicTyping: true,
				complete: (results) => {
					const validData = validateCsvData(results.data);
					setCsvData(validData);
					if (validData.length > 0) {
						toast.success(`Successfully loaded ${validData.length} valid entries from CSV.`);
					} else {
						toast.error("No valid entries found in the CSV file.");
					}
					if (results.data.length !== validData.length) {
						toast.warn(`${results.data.length - validData.length} invalid or duplicate entries were found and skipped.`);
					}
				},
				error: (error) => {
					console.error("CSV parsing error:", error);
					toast.error("Failed to parse CSV file. Please check the file format.");
				},
				beforeFirstChunk: (chunk) => {
					const [header, ...rows] = chunk.split(/\r\n|\r|\n/);
					const newHeader = "receiverAddress,amount";
					return [newHeader, ...rows].join("\n");
				}
			});
		}
	};

	const validateCsvData = (data: CsvData[]) => {
		return data.filter((row) => {
			return (
				typeof row.receiverAddress === 'string' &&
				row.receiverAddress &&
				typeof row.amount === 'number' &&
				row.amount > 0
			);
		});
	};

	// Remove the duplicate declaration of BATCH_SIZE

	const BATCH_SIZE = 5; // Reduced batch size for testing

	const onSubmit = async (data: FormData) => {
		console.log("onSubmit called with data:", data);
	  
		if (!currentAccount) {
		  console.log("No current account");
		  toast.error("Please connect the wallet first");
		  return;
		}
	  
		if (!ADMIN_CAP_OBJECT_ID) {
		  console.log("No AdminCap object ID");
		  toast.error("AdminCap not found. Please ensure you have the correct AdminCap object.");
		  return;
		}
	  
		const {
		  startDate,
		  startTime,
		  duration,
		  durationUnit,
		  claimInterval,
		  claimIntervalUnit,
		  transferPercentage,
		  renouncementStart,
		  renouncementStartTime,
		  renouncementEnd,
		  renouncementEndTime,
		  immediateClaimStart,
		  immediateClaimStartTime,
		  coin,
		} = data;
	  
		if (!startDate || !renouncementStart || !renouncementEnd || !immediateClaimStart) {
		  console.log("Missing required date fields");
		  toast.error("Start date, Renouncement Start, Immediate Claim Start, or Renouncement End is not set");
		  return;
		}
	  
		console.log("Converting dates and times to timestamps");
		
		// Convert date and time to timestamp
		const startTimeMsBigInt = BigInt(convertDateTimeToTimestamp(startDate, startTime));
		const renouncementStartMs = BigInt(convertDateTimeToTimestamp(renouncementStart, renouncementStartTime));
		const renouncementEndMs = BigInt(convertDateTimeToTimestamp(renouncementEnd, renouncementEndTime));
		const immediateClaimStartMsBigInt = BigInt(convertDateTimeToTimestamp(immediateClaimStart, immediateClaimStartTime));
	  
		if (startTimeMsBigInt < BigInt(Date.now())) {
		  console.log("Start time is in the past");
		  toast.error("Start time is in the past");
		  return;
		}
	  
		console.log("Converting duration and claim interval to milliseconds");
		const scaledDuration = BigInt(convertToMilliseconds(duration, durationUnit));
		const scaledClaimInterval = BigInt(convertToMilliseconds(claimInterval, claimIntervalUnit));
	  
		console.log("Fetching coin details");
		const selectedCoinType = coins.find((c) => c.coinObjectId === coin)?.coinType;
		const selectedCoinDecimals = coins.find((c) => c.coinObjectId === coin)?.decimals;
	  
		if (!selectedCoinType || selectedCoinDecimals === undefined) {
		  console.log("Selected coin type or decimals not found");
		  toast.error("Selected coin type or decimals not found");
		  return;
		}
	  
		try {
		  if (csvData.length > 0) {
			// Batch creation using CSV data
			await createBatchVestings(
			  selectedCoinType,
			  selectedCoinDecimals,
			  startTimeMsBigInt,
			  scaledDuration,
			  scaledClaimInterval,
			  transferPercentage,
			  renouncementStartMs,
			  renouncementEndMs,
			  immediateClaimStartMsBigInt
			);
		  } else {
			// Single vesting creation
			await createSingleVesting(
			  data,
			  selectedCoinType,
			  selectedCoinDecimals,
			  startTimeMsBigInt,
			  scaledDuration,
			  scaledClaimInterval,
			  transferPercentage,
			  renouncementStartMs,
			  renouncementEndMs,
			  immediateClaimStartMsBigInt
			);
		  }
		} catch (e: unknown) {
		  console.error("Transaction error:", e);
		  if (e instanceof Error) {
			if (e.message.includes("User rejected the request")) {
			  toast.error("Transaction rejected by user.");
			} else {
			  toast.error(`Transaction failed: ${e.message}`);
			}
		  } else {
			toast.error("Transaction failed for unknown reason");
		  }
		}
	  };
	  
	  const createSingleVesting = async (
		data: FormData,
		selectedCoinType: string,
		selectedCoinDecimals: number,
		startTimeMsBigInt: bigint,
		scaledDuration: bigint,
		scaledClaimInterval: bigint,
		transferPercentage: number,
		renouncementStartMs: bigint,
		renouncementEndMs: bigint,
		immediateClaimStartMsBigInt: bigint
	  ) => {
		const { receiver, amount = 0, coin } = data;
		const scaledAmount = BigInt(Math.floor(amount * Math.pow(10, selectedCoinDecimals)));
	  
		const txBlock = new TransactionBlock();
		txBlock.setGasBudget(200000000);
	  
		txBlock.moveCall({
		  target: `${seedifyProtocolAddress}::seedifyprotocol::entry_new`,
		  arguments: [
			txBlock.object(ADMIN_CAP_OBJECT_ID),
			txBlock.object(coin),
			txBlock.pure(scaledAmount, "u64"),
			txBlock.pure(transferPercentage, "u64"),
			txBlock.pure(immediateClaimStartMsBigInt, "u64"),
			txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"),
			txBlock.pure(startTimeMsBigInt, "u64"),
			txBlock.pure(scaledDuration, "u64"),
			txBlock.pure(scaledClaimInterval, "u64"),
			txBlock.pure(renouncementStartMs, "u64"),
			txBlock.pure(renouncementEndMs, "u64"),
			txBlock.pure(receiver, "address"),
		  ],
		  typeArguments: [selectedCoinType],
		});
	  
		const result = await signAndExecuteTransactionBlock.mutateAsync({
		  transactionBlock: txBlock,
		  options: {
			showObjectChanges: true,
			showEffects: true,
		  },
		  requestType: "WaitForLocalExecution",
		});
	  
		console.log("Transaction executed successfully:", result);
		setDigest(result.digest);
		toast.success(`Vesting created successfully for ${receiver}`);
	  };
	  
	  const createBatchVestings = async (
		selectedCoinType: string,
		selectedCoinDecimals: number,
		startTimeMsBigInt: bigint,
		scaledDuration: bigint,
		scaledClaimInterval: bigint,
		transferPercentage: number,
		renouncementStartMs: bigint,
		renouncementEndMs: bigint,
		immediateClaimStartMsBigInt: bigint
	  ) => {
		const batchSize = 5; // You can adjust this based on your needs
		for (let i = 0; i < csvData.length; i += batchSize) {
		  const batch = csvData.slice(i, i + batchSize);
		  const txBlock = new TransactionBlock();
		  txBlock.setGasBudget(200000000 * batch.length); // Adjust gas budget based on batch size
	  
		  for (const entry of batch) {
			const scaledAmount = BigInt(Math.floor(entry.amount * Math.pow(10, selectedCoinDecimals)));
	  
			txBlock.moveCall({
			  target: `${seedifyProtocolAddress}::seedifyprotocol::entry_new`,
			  arguments: [
				txBlock.object(ADMIN_CAP_OBJECT_ID),
				txBlock.object(selectedCoin),
				txBlock.pure(scaledAmount, "u64"),
				txBlock.pure(transferPercentage, "u64"),
				txBlock.pure(immediateClaimStartMsBigInt, "u64"),
				txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"),
				txBlock.pure(startTimeMsBigInt, "u64"),
				txBlock.pure(scaledDuration, "u64"),
				txBlock.pure(scaledClaimInterval, "u64"),
				txBlock.pure(renouncementStartMs, "u64"),
				txBlock.pure(renouncementEndMs, "u64"),
				txBlock.pure(entry.receiverAddress, "address"),
			  ],
			  typeArguments: [selectedCoinType],
			});
		  }
	  
		  const result = await signAndExecuteTransactionBlock.mutateAsync({
			transactionBlock: txBlock,
			options: {
			  showObjectChanges: true,
			  showEffects: true,
			},
			requestType: "WaitForLocalExecution",
		  });
	  
		  console.log(`Batch ${i / batchSize + 1} executed successfully:`, result);
		  setDigest(result.digest);
		}
	  
		toast.success(`Batch vesting creation completed for ${csvData.length} entries`);
	  };
	  
	  const convertDateTimeToTimestamp = (date: Date, time: string): number => {
		const [hour, minute, period] = time.split(/[: ]/);
		const hour24 = convertTo24HourFormat(parseInt(hour, 10), period as "AM" | "PM");
		date.setHours(hour24, parseInt(minute, 10), 0, 0);
		return date.getTime();
	  };
	
	

	return (
		<Layout>
			<LayoutHeader>
				<div className='ml-auto flex items-center space-x-4'>
					<UserNav />
				</div>
			</LayoutHeader>
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
									CREATE VESTING
								</h2>
								<Form {...formMethods} handleSubmit={handleSubmit} control={control}>
									<form onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
										<FormField
											control={control}
											name='coin'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Select Coin</FormLabel>
													<FormControl>
														<Select
															onValueChange={(value) => {
																field.onChange(value);
																setSelectedCoin(value);
																const selectedCoinData = coins.find((coin) => coin.coinObjectId === value);
																if (selectedCoinData) {
																	setSelectedCoinDecimals(selectedCoinData.decimals); // Set decimals
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
													</FormControl>
													<FormDescription>Select the coin for vesting.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										
										<FormField
											control={control}
											name='startDate'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Start Date</FormLabel>
													<FormControl>
														<Popover>
															<PopoverTrigger asChild>
																<Button
																	variant={"outline"}
																	className={cn(
																		"w-[400px] pl-6 justify-start text-left font-normal",
																		!field.value && "text-muted-foreground"
																	)}
																>
																	<CalendarIcon className='mr-2 h-4 w-4' />
																	{field.value ? format(field.value, "PPP") : "Pick a date"}
																</Button>
															</PopoverTrigger>
															<PopoverContent className='w-auto p-0'>
																<Calendar
																	mode='single'
																	selected={field.value || undefined}
																	onSelect={(date) => field.onChange(date)}
																	initialFocus
																/>
															</PopoverContent>
														</Popover>
													</FormControl>
													<FormDescription>Select the start date for the vesting.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='startTime'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Start Time</FormLabel>
													<FormControl>
														<Input
															type='text'
															{...field}
															className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
															placeholder='e.g., 12:30 PM'
														/>
													</FormControl>
													<FormDescription>Enter the start time (e.g., 12:30 PM).</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='duration'
											render={() => (
												<FormItem>
													<FormLabel>Duration</FormLabel>
													<FormControl>
														<Controller
															name='duration'
															control={control}
															render={({ field }) => (
																<Input
																	type='number'
																	{...field}
																	value={field.value || ""}
																	onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>Enter the duration of the vesting period.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='durationUnit'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Duration Unit</FormLabel>
													<FormControl>
														<Select
															onValueChange={field.onChange}
															defaultValue={field.value}
														>
															<SelectTrigger>
																<SelectValue placeholder='Select duration unit' />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value='minutes'>Minutes</SelectItem>
																<SelectItem value='hours'>Hours</SelectItem>
																<SelectItem value='days'>Days</SelectItem>
															</SelectContent>
														</Select>
													</FormControl>
													<FormDescription>Select the unit of duration.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='claimInterval'
											render={() => (
												<FormItem>
													<FormLabel>Claim Interval</FormLabel>
													<FormControl>
														<Controller
															name='claimInterval'
															control={control}
															render={({ field }) => (
																<Input
																	type='number'
																	{...field}
																	value={field.value || ""}
																	onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
																	className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
																/>
															)}
														/>
													</FormControl>
													<FormDescription>Enter the interval for claims.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='claimIntervalUnit'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Claim Interval Unit</FormLabel>
													<FormControl>
														<Select
															onValueChange={field.onChange}
															defaultValue={field.value}
														>
															<SelectTrigger>
																<SelectValue placeholder='Select interval unit' />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value='minutes'>Minutes</SelectItem>
																<SelectItem value='hours'>Hours</SelectItem>
																<SelectItem value='days'>Days</SelectItem>
															</SelectContent>
														</Select>
													</FormControl>
													<FormDescription>Select the unit of the claim interval.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={control}
											name='renouncementStart'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Renouncement Start Date</FormLabel>
													<FormControl>
														<Popover>
															<PopoverTrigger asChild>
																<Button
																	variant={"outline"}
																	className={cn(
																		"w-[400px] pl-6 justify-start text-left font-normal",
																		!field.value && "text-muted-foreground"
																	)}
																>
																	<CalendarIcon className='mr-2 h-4 w-4' />
																	{field.value ? format(field.value, "PPP") : "Pick a date"}
																</Button>
															</PopoverTrigger>
															<PopoverContent className='w-auto p-0'>
																<Calendar
																	mode='single'
																	selected={field.value || undefined}
																	onSelect={(date) => field.onChange(date)}
																	initialFocus
																/>
															</PopoverContent>
														</Popover>
													</FormControl>
													<FormDescription>Select the start date for renouncement.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

<FormField
	control={control}
	name='renouncementStartTime'
	render={({ field }) => (
		<FormItem>
			<FormLabel>Renouncement Start Time</FormLabel>
			<FormControl>
				<Input
					type='text'
					{...field}
					className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
					placeholder='e.g., 12:30 PM'
				/>
			</FormControl>
			<FormDescription>Enter the start time for renouncement (e.g., 12:30 PM).</FormDescription>
			<FormMessage />
		</FormItem>
	)}
/>
										<FormField
											control={control}
											name='renouncementEnd'
											render={({ field }) => (
												<FormItem>
													<FormLabel>Renouncement End Date</FormLabel>
													<FormControl>
														<Popover>
															<PopoverTrigger asChild>
																<Button
																	variant={"outline"}
																	className={cn(
																		"w-[400px] pl-6 justify-start text-left font-normal",
																		!field.value && "text-muted-foreground"
																	)}
																>
																	<CalendarIcon className='mr-2 h-4 w-4' />
																	{field.value ? format(field.value, "PPP") : "Pick a date"}
																</Button>
															</PopoverTrigger>
															<PopoverContent className='w-auto p-0'>
																<Calendar
																	mode='single'
																	selected={field.value || undefined}
																	onSelect={(date) => field.onChange(date)}
																	initialFocus
																/>
															</PopoverContent>
														</Popover>
													</FormControl>
													<FormDescription>Select the end date for renouncement.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

<FormField
	control={control}
	name='renouncementEndTime'
	render={({ field }) => (
		<FormItem>
			<FormLabel>Renouncement End Time</FormLabel>
			<FormControl>
				<Input
					type='text'
					{...field}
					className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
					placeholder='e.g., 12:30 PM'
				/>
			</FormControl>
			<FormDescription>Enter the end time for renouncement (e.g., 12:30 PM).</FormDescription>
			<FormMessage />
		</FormItem>
	)}
/>
										<FormField
											control={control}
											name='immediateClaimStart' // New field
											render={({ field }) => (
												<FormItem>
													<FormLabel>Immediate Claim Start Date</FormLabel>
													<FormControl>
														<Popover>
															<PopoverTrigger asChild>
																<Button
																	variant={"outline"}
																	className={cn(
																		"w-[400px] pl-6 justify-start text-left font-normal",
																		!field.value && "text-muted-foreground"
																	)}
																>
																	<CalendarIcon className='mr-2 h-4 w-4' />
																	{field.value ? format(field.value, "PPP") : "Pick a date"}
																</Button>
															</PopoverTrigger>
															<PopoverContent className='w-auto p-0'>
																<Calendar
																	mode='single'
																	selected={field.value || undefined}
																	onSelect={(date) => field.onChange(date)}
																	initialFocus
																/>
															</PopoverContent>
														</Popover>
													</FormControl>
													<FormDescription>Select the start date for immediate claim.</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

<FormField
	control={control}
	name='immediateClaimStartTime'
	render={({ field }) => (
		<FormItem>
			<FormLabel>Immediate Claim Start Time</FormLabel>
			<FormControl>
				<Input
					type='text'
					{...field}
					className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
					placeholder='e.g., 12:30 PM'
				/>
			</FormControl>
			<FormDescription>Enter the start time for immediate claim (e.g., 12:30 PM).</FormDescription>
			<FormMessage />
		</FormItem>
	)}
/>
<FormField
    control={control}
    name='receiver'
    render={({ field }) => (
        <FormItem>
            <FormLabel>Receiver Address</FormLabel>
            <FormControl>
                <Input
                    type='text'
                    {...field}
                    className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                />
            </FormControl>
            <FormDescription>Enter the receiver address.</FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>
<FormField
    control={control}
    name='amount'
    render={({ field }) => (
        <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
                <Input
                    type='number'
                    {...field}
                    value={field.value ?? 0}  // Ensure the value is set to 0 if undefined
                    onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value, 10)))}  // Prevent negative values
                    className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                />
            </FormControl>
            <FormDescription>Enter the amount to be vested.</FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>

<FormField
    control={control}
    name='transferPercentage'
    render={() => (
        <FormItem>
            <FormLabel>TGE Percentage</FormLabel>
            <FormControl>
                <Controller
                    name='transferPercentage'
                    control={control}
                    render={({ field }) => (
                        <Input
                            type='number'
                            {...field}
                            value={field.value || 0} // Set default to 0
                            onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value, 10)))} // Prevent negative value
                            className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                            placeholder='Enter percentage (0-100)'
                        />
                    )}
                />
            </FormControl>
            <FormDescription>Enter the immediate transfer percentage (0-100).</FormDescription>
            <FormMessage />
        </FormItem>
    )}
/>
										
										<FormItem>
											<FormLabel>Upload CSV</FormLabel>
											<input
												type='file'
												accept='.csv'
												onChange={handleCsvUpload}
												className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
											/>
											<FormDescription>
												Upload a CSV file with columns receiverAddress and amount.
											</FormDescription>
										</FormItem>
										<Button
											type='submit'
											className='bg-blue-600 text-white hover:bg-blue-700'
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
		</Layout>
	);
};

export default Create;