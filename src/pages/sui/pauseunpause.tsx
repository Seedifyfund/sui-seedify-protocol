import React, { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar2 from '../../components/sidebar';
import { useNetwork } from '../../components/NetworkContext';
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutHeader } from '@/components/custom/layout';

const formSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  adminCapId: z.string().min(1, "AdminCap ID is required"),
  globalPauseStateId: z.string().min(1, "GlobalPauseState ID is required"),
  action: z.enum(["pause", "unpause"]),
});

type FormData = z.infer<typeof formSchema>;

const PauseUnpauseContract: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
  const { network } = useNetwork();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packageId: "",
      adminCapId: "",
      globalPauseStateId: "",
      action: "pause",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!currentAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const txBlock = new TransactionBlock();
      txBlock.setGasBudget(10000000);

      txBlock.moveCall({
        target: `${data.packageId}::seedifyprotocol::${data.action}_contract`,
        arguments: [
          txBlock.object(data.adminCapId),
          txBlock.object(data.globalPauseStateId),
        ],
      });

      const result = await signAndExecuteTransactionBlock.mutateAsync({
        transactionBlock: txBlock,
        options: {
          showObjectChanges: true,
          showEffects: true,
        },
        requestType: "WaitForLocalExecution",
      });

      if (result.effects?.status?.status === "success") {
        toast.success(`Contract ${data.action === 'pause' ? 'paused' : 'unpaused'} successfully`);
      } else {
        toast.error(`Failed to ${data.action} contract: ${result.effects?.status?.error}`);
      }
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
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
          <div className='container mx-auto p-4 text-white'>
            <ToastContainer />
            <div className='flex justify-center items-center min-h-screen'>
              <div className='rounded-lg shadow-lg p-6 w-full max-w-md'>
                <h2 className='text-2xl font-semibold mb-4 text-center'>
                  Pause/Unpause Contract
                </h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
                    <FormField
                      control={form.control}
                      name='packageId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Package ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                            />
                          </FormControl>
                          <FormDescription>Enter the package ID.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='adminCapId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AdminCap ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                            />
                          </FormControl>
                          <FormDescription>Enter the AdminCap ID.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='globalPauseStateId'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GlobalPauseState ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className='mt-1 block w-full border-gray-600 bg-gray-700 text-white rounded-md shadow-sm'
                            />
                          </FormControl>
                          <FormDescription>Enter the GlobalPauseState ID.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='action'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Action</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pause">Pause</SelectItem>
                              <SelectItem value="unpause">Unpause</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Select the action to perform.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type='submit'
                      className='bg-blue-600 text-white hover:bg-blue-700'
                    >
                      Submit
                    </Button>
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

export default PauseUnpauseContract;