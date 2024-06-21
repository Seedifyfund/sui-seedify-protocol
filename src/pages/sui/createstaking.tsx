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
import Sidebar2 from "@/components/sidebar";
import { useNetwork } from '@/components/NetworkContext';
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutHeader } from '@/components/custom/layout';

const formSchema = z.object({
    duration: z.preprocess((val) => Number(val), z.number().min(1)),
    claimInterval: z.preprocess((val) => Number(val), z.number().min(1)),
    rewardPercentage: z.preprocess((val) => Number(val), z.number().min(0).max(100)),
    amount: z.preprocess((val) => Number(val), z.number().min(1)),
    coin: z.string().min(1),
});

interface FormData {
    duration: number;
    claimInterval: number;
    rewardPercentage: number;
    amount: number;
    coin: string;
}

interface CoinBalance {
    coinType: string;
    totalBalance: string;
    coinObjectCount: number;
    lockedBalance: Record<string, string>;
}

const CreateStaking: React.FC = () => {
    const currentAccount = useCurrentAccount();
    const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
    const { control, handleSubmit, ...formMethods } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            duration: 1,
            claimInterval: 1,
            rewardPercentage: 0,
            amount: 1,
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
    const [selectedCoin, setSelectedCoin] = useState<string>("");
    const [isCollapsed, setIsCollapsed] = useState(false);

    const { network } = useNetwork();
    const client = new SuiClient({ url: getFullnodeUrl(network) });

    

    const multisenderAddress = network === 'mainnet'
        ? import.meta.env.VITE_STAKING_MAINNET_TORQUE_ADDRESS
        : import.meta.env.VITE_STAKING_TESTNET_TORQUE_ADDRESS;

    useEffect(() => {
        if (currentAccount) {
            fetchBalances(currentAccount.address);
        }
    }, [currentAccount, network]);

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
            const response = await client.getObject({ id: objectId });
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
            duration,
            claimInterval,
            rewardPercentage,
            coin,
        } = data;
    
        const durationBigInt = BigInt(duration);
        const claimIntervalBigInt = BigInt(claimInterval);
        const rewardPercentageBigInt = BigInt(rewardPercentage);
    
        const txBlock = new TransactionBlock();
        txBlock.setGasBudget(10000000);
    
        // Fetch coin details and ensure they are valid
        const tokenDetails = await fetchCoinDetails(coin);
        if (!tokenDetails || !tokenDetails.objectId || !tokenDetails.version || !tokenDetails.digest) {
            console.error("Invalid token coin data:", tokenDetails);
            return;
        }
    
        // Ensure gas coin is available and valid
        const gasCoin = coins.find((c) => c.coinObjectId !== coin);
        if (!gasCoin) {
            console.error("No valid gas coin found");
            return;
        }
    
        const gasCoinDetails = await fetchCoinDetails(gasCoin.coinObjectId);
        if (!gasCoinDetails || !gasCoinDetails.objectId || !gasCoinDetails.version || !gasCoinDetails.digest) {
            console.error("Invalid gas coin data:", gasCoinDetails);
            return;
        }
    
        txBlock.setGasPayment([
            { objectId: gasCoinDetails.objectId, version: gasCoinDetails.version, digest: gasCoinDetails.digest },
        ]);
    
        const selectedCoinType = coins.find(
            (c) => c.coinObjectId === coin
        )?.coinType;
        if (!selectedCoinType) {
            console.error("Selected coin type not found");
            return;
        }
    
        // Assuming this is the Clock object
        const clockObjectId = "0x0000000000000000000000000000000000000000000000000000000000000006";
    
        console.log("Calling moveCall with arguments:", {
            selectedCoinType,
            coin,
            durationBigInt,
            claimIntervalBigInt,
            rewardPercentageBigInt,
            clockObjectId,
        });
    
        txBlock.moveCall({
            target: `${multisenderAddress}::torque_staking::entry_new`,
            arguments: [
                txBlock.object(coin), // Arg0: coin object ID
                txBlock.pure(durationBigInt.toString(), "u64"), // Arg1: duration
                txBlock.pure(claimIntervalBigInt.toString(), "u64"), // Arg2: claim interval
                txBlock.pure(rewardPercentageBigInt.toString(), "u64"), // Arg3: reward percentage
                txBlock.object(clockObjectId), // Arg4: clock object ID
            ],
            typeArguments: [selectedCoinType], // Type0: selected coin type
        });

        console.log("moveCall arguments:", {
            target: `${multisenderAddress}::torque_staking::entry_new`,
            arguments: [
                coin,
                durationBigInt.toString(),
                claimIntervalBigInt.toString(),
                rewardPercentageBigInt.toString(),
                clockObjectId,
            ],
            typeArguments: [selectedCoinType],
        });
    
        try {
            const result = await signAndExecuteTransactionBlock.mutateAsync({
                transactionBlock: txBlock,
                options: {
                    showObjectChanges: false,
                    showEffects: false,
                },
                requestType: "WaitForLocalExecution",
            });
            setDigest(result.digest);
            toast.success("Transaction successful!");
    
            const transaction = await client.waitForTransactionBlock({
                digest: result.digest,
                options: {
                    showEffects: true,
                },
                timeout: 60000,
                pollInterval: 2000,
            });
        } catch (error) {
            toast.error("Transaction execution failed");
            console.error(error); // Log the error for debugging
        }
    };
    


    return (
        <>
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
                                                name='duration'
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
                                                                            onValueChange={(value) => {
                                                                                field.onChange(value);
                                                                                setSelectedCoin(value);
                                                                            }}
                                                                            defaultValue=''>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder='Select a coin' />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {coins.map((coin) => (
                                                                                    <SelectItem
                                                                                        key={coin.coinObjectId}
                                                                                        value={coin.coinObjectId}>
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
                                                            <FormDescription>
                                                                Enter the duration of the staking period.
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    </>
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
                                                        <FormDescription>
                                                            Enter the interval for claims.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={control}
                                                name='rewardPercentage'
                                                render={() => (
                                                    <FormItem>
                                                        <FormLabel>Reward Percentage</FormLabel>
                                                        <FormControl>
                                                            <Controller
                                                                name='rewardPercentage'
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Input
                                                                        type='number'
                                                                        {...field}
                                                                        value={field.value || ""}
                                                                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                                                                        className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                                                                        placeholder='Enter percentage (0-100)'
                                                                    />
                                                                )}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Enter the reward percentage (0-100).
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                         
                                            <Button
                                                type='submit'
                                                className='bg-blue-600 text-white hover:bg-blue-700'>
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
        </>
    );
};

export default CreateStaking;
