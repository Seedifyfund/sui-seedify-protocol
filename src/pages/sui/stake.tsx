"use client";
import React, { useState } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
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
    useCurrentAccount,
    useSignAndExecuteTransactionBlock,
} from "@mysten/dapp-kit";
import { useForm } from "react-hook-form";
import "react-toastify/dist/ReactToastify.css";
import { toast, ToastContainer } from "react-toastify";
import Sidebar2 from "../../components/sidebar";
import { useNetwork } from '../../components/NetworkContext';
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutHeader } from '@/components/custom/layout';
import axios from 'axios';

const formSchema = z.object({
    amount: z.preprocess((val) => Number(val), z.number().min(1, "Amount is required")),
});

interface FormData {
    amount: number;
}

const StakeToken: React.FC = () => {
    const api = "http://localhost:8000/api";
    const currentAccount = useCurrentAccount();
    const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
    const { control, handleSubmit, ...formMethods } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 1000,
        },
    });

    const [digest, setDigest] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse

    const { network } = useNetwork(); // Use selectedNetwork from context
    const client = new SuiClient({ url: getFullnodeUrl(network) });

    const onSubmit = async (data: FormData) => {
        if (!currentAccount) {
            toast.error("Please connect the wallet first");
            return;
        }

        const { amount } = data;

        console.log("Form data:", data);
        const scaledAmount = BigInt(amount * 1_000_000_000); // Adjust this scaling factor based on the token's decimals


        const selectedCoinObject = "0x1edd8639b045d0097405f13edd7d28df97cc349d8d749c62d30c782bd49c261f";
        const selectedCoinType = "0x36647b3f198d54d74bf99c7a8d4eaa41b853e99d6e4a14adba37b351643d7480::test::TEST";
        const stakingInstance = "0xab4cefef6e7b5f461df39c5951319717f4a3d9e9a11298cf3129082c5f77daf6";
        const clockObject = "0x0000000000000000000000000000000000000000000000000000000000000006";
        console.log("Form data:", data);
        console.log("Selected Coin Object:", selectedCoinObject);
        console.log("Selected Coin Type:", selectedCoinType);
        console.log("Staking Instance:", stakingInstance);
        console.log("Clock Object:", clockObject);
        console.log("Scaled Amount:", scaledAmount);
        
        const txBlock = new TransactionBlock();
        txBlock.setGasBudget(1000000000);
        
        txBlock.moveCall({
            target: `0x7c77a05c0de6b8025ab0941477c3aff4bbfcd9ae7c51c29ce55472a0b72ba292::artfi_staking::stake_token`,
            arguments: [
                txBlock.object(selectedCoinObject),
                txBlock.pure(scaledAmount, "u64"),
                txBlock.sharedObjectRef({
                    objectId: stakingInstance,
                    initialSharedVersion: 66417956,
                    mutable: true,
                }),
                txBlock.sharedObjectRef({
                    objectId: clockObject,
                    initialSharedVersion: 1,
                    mutable: false,
                }),
            ],
            typeArguments: [selectedCoinType],
        });
        
        console.log("Transaction block created:", JSON.stringify(txBlock, null, 2));
        

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
                    `${api}/staking/stakeToken`,
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
                            <div className='rounded-lg shadow-lg p-6 w-full max-w-md'>
                                <h2 className='text-2xl font-semibold mb-4 text-center'>
                                    STAKE TOKEN
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
                                        <Button
                                            type='submit'
                                            className='bg-blue-600 text-white hover:bg-blue-700'
                                        >
                                            Stake Token
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

export default StakeToken;
