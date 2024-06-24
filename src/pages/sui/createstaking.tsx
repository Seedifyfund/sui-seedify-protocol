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
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutHeader } from '@/components/custom/layout';

const formSchema = z.object({
    dpr: z.preprocess((val) => Number(val), z.number().min(1, "DPR is required").max(10000, "DPR must be between 1 and 10000")),
    startDate: z.date().nullable(), // allow null but required
    duration: z.preprocess((val) => Number(val), z.number().min(1, "Duration is required")),
    claimInterval: z.preprocess((val) => Number(val), z.number().min(1, "Claim Interval is required")),
    amount: z.preprocess((val) => Number(val), z.number().min(1, "Amount is required")),
    maxStake: z.preprocess((val) => Number(val), z.number().min(1, "Max Stake is required")),
    totalCapacity: z.preprocess((val) => Number(val), z.number().min(1, "Total Capacity is required")),
    coin: z.string().min(1, "Coin is required"),
});

interface FormData {
    dpr: number;
    startDate: Date | null;
    duration: number;
    claimInterval: number;
    amount: number;
    coin: string;
    maxStake: number;
    totalCapacity: number;
}

interface CoinBalance {
    coinType: string;
    totalBalance: string;
    coinObjectCount: number;
    lockedBalance: Record<string, string>;
}

const CreateStaking: React.FC = () => {
    const api = "http://localhost:8000/api";
    const currentAccount = useCurrentAccount();
    const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
    const { control, handleSubmit, ...formMethods } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dpr: 0,
            startDate: null,
            duration: 1,
            claimInterval: 1,
            amount: 1,
            maxStake: 1,
            totalCapacity: 1,
            coin: "",
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
    const [selectedCoin, setSelectedCoin] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse

    const { network } = useNetwork(); // Use selectedNetwork from context
    const client = new SuiClient({ url: getFullnodeUrl(network) });

    const torqueStakingAddress = network === 'mainnet'
        ? import.meta.env.VITE_MAINNET_STAKING_ADDRESS
        : import.meta.env.VITE_TESTNET_STAKING_ADDRESS;

    useEffect(() => {
        if (currentAccount) {
            fetchBalances(currentAccount.address);
        }
    }, [currentAccount, network]); // Include selectedNetwork in the dependency array

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
            }[];

            setCoins(validCoins);
        } catch (e) {
            console.error("Failed to fetch balances:", e);
        }
    };

    const fetchCoinDetails = async (objectId: string) => {
        try {
            console.log(`Fetching details for coin with object ID: ${objectId}`);
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
            dpr,
            startDate,
            duration,
            claimInterval,
            amount,
            maxStake,
            totalCapacity,
            coin,
        } = data;

        console.log("Form data:", data);

        if (!startDate) {
            console.error("Start date is not set");
            return;
        }

        const startTimeMs = startDate.getTime();

        if (startTimeMs < Date.now()) {
            console.error("Start time is in the past");
            return;
        }

        // Validate that maxStake and totalCapacity are numbers
        if (isNaN(maxStake) || isNaN(totalCapacity)) {
            console.error("Max Stake or Total Capacity is not a valid number");
            return;
        }

        const scaledAmount = BigInt(amount * 1_000_000_000); // Adjust this scaling factor based on the token's decimals
        const scaledDuration = BigInt(duration * 24 * 60 * 60 * 1000); // Convert duration to milliseconds
        const scaledClaimInterval = BigInt(claimInterval * 24 * 60 * 60 * 1000); // Convert claim interval to milliseconds
        const scaledMaxStake = BigInt(maxStake * 1_000_000_000); // Adjust this scaling factor based on the token's decimals
        const scaledTotalCapacity = BigInt(totalCapacity * 1_000_000_000); // Adjust this scaling factor based on the token's decimals

        const txBlock = new TransactionBlock();
        txBlock.setGasBudget(10000000);

        const gasCoinDetails = await fetchCoinDetails(selectedCoin);
        console.log("Gas coin details:", gasCoinDetails);
        if (!gasCoinDetails || !gasCoinDetails.objectId || !gasCoinDetails.version || !gasCoinDetails.digest) {
            console.error("Invalid gas coin data:", gasCoinDetails);
            return;
        }

        // const { objectId: gasObjectId, version: gasVersion, digest: gasDigest } = gasCoinDetails;

        const selectedCoinType = coins.find((c) => c.coinObjectId === selectedCoin)?.coinType;
        console.log("Selected coin type:", selectedCoinType);
        if (!selectedCoinType) {
            console.error("Selected coin type not found");
            return;
        }

        console.log("Coin object ID:", selectedCoin);

        // txBlock.setGasPayment([{ objectId: gasObjectId, version: gasVersion, digest: gasDigest }]);

        txBlock.setGasBudget(100000000);
        txBlock.moveCall({
            target: `${torqueStakingAddress}::torque_staking::create_staking`,
            arguments: [
                txBlock.pure(dpr, "u64"),
                txBlock.object(selectedCoin),
                txBlock.pure(scaledAmount, "u64"),
                txBlock.pure(scaledDuration, "u64"),
                txBlock.pure(scaledClaimInterval, "u64"),
                txBlock.pure(scaledMaxStake, "u64"),
                txBlock.pure(scaledTotalCapacity, "u64"),
                txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"), // Assuming this is the Clock object
            ],
            typeArguments: [selectedCoinType],
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

            try {
                const response = await axios.post(
                    `${api}/staking/createStaking`,
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
                <div className='container mx-auto p-4 text-white '>
                    <ToastContainer />
                    <div className='flex justify-center items-center min-h-screen'>
                        <div className=' rounded-lg shadow-lg p-6 w-full max-w-md'>
                            <h2 className='text-2xl font-semibold mb-4 text-center'>
                                CREATE STAKING
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
                                        name='dpr'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>DPR (Daily Percentage Rate)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type='number'
                                                        {...field}
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the Daily Percentage Rate for staking.
                                                </FormDescription>
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
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value || undefined}
                                                                onSelect={(date) => field.onChange(date)}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </FormControl>
                                                <FormDescription>
                                                    Select the start date for the staking.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name='duration'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Duration (in days)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type='number'
                                                        {...field}
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the duration of the staking period in days.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name='claimInterval'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Claim Interval (in days)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type='number'
                                                        {...field}
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the interval for claiming rewards in days.
                                                </FormDescription>
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
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the amount to be staked.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name='maxStake'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Stake</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type='number'
                                                        {...field}
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the maximum amount each user can stake.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name='totalCapacity'
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Total Capacity</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type='number'
                                                        {...field}
                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the total capacity of the staking pool.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
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
                                                        }}
                                                        defaultValue=''
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder='Select a coin' />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {coins.map((coin) => (
                                                                <SelectItem key={coin.coinObjectId} value={coin.coinObjectId}>
                                                                    {coin.coinName} - Balance: {coin.totalBalance}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormDescription>
                                                    Select the coin for staking.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type='submit'
                                        className='bg-blue-600 text-white hover:bg-blue-700'
                                    >
                                        Create Staking
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

export default CreateStaking;
