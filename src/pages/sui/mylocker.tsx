"use client";

import { Copy } from "lucide-react";
import React, { useState, useEffect } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from "@mysten/dapp-kit";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import "@mysten/dapp-kit/dist/index.css";
import Tooltip from "@/components/custom/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Sidebar2 from '../../components/sidebar';
import { useNetwork } from '../../components/NetworkContext'; // Adjust the path as necessary
import { Layout, LayoutHeader } from '@/components/custom/layout';
import { UserNav } from '@/components/user-nav';

interface LockerFields {
  id: { id: string };
  balance: number;
  unlocked: number;
  duration: number;
  start: number;
  lockerType: string; 
  coinName: string; 
}

const MyLocker: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
  const { network } = useNetwork(); // Use selectedNetwork from context
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const [lockers, setLockers] = useState<LockerFields[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse

  const torqueLockerAddress = network === 'mainnet'
    ? import.meta.env.VITE_MAINNET_LOCKER_ADDRESS
    : import.meta.env.VITE_TESTNET_LOCKER_ADDRESS;

  const fetchLockerStatus = async () => {
    try {
      const response: any = await client.getOwnedObjects({
        owner: currentAccount?.address || "",
        filter: {
          StructType: `${torqueLockerAddress}::torquelocker::Locker`
        },
        options: {
          showType: true,
          showContent: true,
        },
      });

      const filteredObjects = response.data.filter((obj: any) => obj.data?.objectId);

      const fetchedLockers = await Promise.all(
        filteredObjects.map(async (obj: any) => {
          try {
            const lockerResponse: any = await client.getObject({
              id: obj.data.objectId,
              options: { showContent: true },
            });

            const locker = lockerResponse.data;
            console.log('Locker Object:', JSON.stringify(locker, null, 2)); // Log the entire locker object

            const fields = locker?.content?.fields;

            // Extract lockerType from the full type string
            const fullType = locker.content.type;
            const typeMatch = fullType.match(/<(.+)>/);
            const lockerType = typeMatch ? typeMatch[1] : null;

            console.log('Extracted Locker Type:', lockerType); // Debug logging

            // Fetch coin metadata to get coinName
            const coinMetadata = await client.getCoinMetadata({ coinType: lockerType });
            const coinName = coinMetadata?.name ?? ""; // Add null check for coinMetadata

            return {
              id: { id: fields.id.id },
              balance: Number(fields.balance) / 1_000_000_000, // Adjust balance
              unlocked: Number(fields.unlocked) / 1_000_000_000, // Adjust unlocked
              duration: Number(fields.duration) / (24 * 60 * 60 * 1000), // Convert to days
              start: Number(fields.start),
              lockerType: lockerType, // Use the extracted lockerType
              coinName: coinName, // Add coinName
            } as LockerFields;
          } catch (error) {
            console.log('Error fetching locker details:', error);
            return null;
          }
        })
      );

      setLockers(fetchedLockers.filter(locker => locker !== null) as LockerFields[]);
    } catch (error) {
      console.error("Failed to fetch locker status:", error);
    }
  };

  const unlockLockedAmount = async (lockerId: string, lockerType: string) => {
    try {
        toast.info("Unlocking locked amount...");
        const txBlock = new TransactionBlock();
        txBlock.setGasBudget(10000000); // Ensure you have enough gas budget
        txBlock.moveCall({
            target: `${torqueLockerAddress}::torquelocker::entry_unlock`,
            arguments: [
                txBlock.object(lockerId), // Locker object
                txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"), // Clock (use the correct clock object ID)
            ],
            typeArguments: [lockerType],
        });

        const result = await signAndExecuteTransactionBlock.mutateAsync({
            transactionBlock: txBlock,
            options: {
                showObjectChanges: true,
                showEffects: true,
            },
            requestType: "WaitForLocalExecution",
        });

        if (result.effects && result.effects.status && result.effects.status.status === "failure") {
            const errorMessage = result.effects.status.error || "Transaction failed";
            if (errorMessage.includes("gas")) {
                toast.error("No Gas coin for Transaction.");
            } else if (errorMessage.includes("unlock")) {
                toast.error("No tokens to unlock.");
            } else {
                toast.error(errorMessage);
            }
        } else {
            toast.success("Transaction successful.");
            // Update the unlocked amount in the state
            setLockers(lockers.map(locker => 
                locker.id.id === lockerId 
                ? { ...locker, unlocked: locker.balance } 
                : locker
            ));
        }
    } catch (error) {
        const errorMessage = (error as Error).message || "Transaction failed";
        if (errorMessage.includes("gas")) {
            toast.error("No Gas coin for Transaction.");
        } else if (errorMessage.includes("unlock")) {
            toast.error("No tokens to unlock.");
        } else {
            toast.error(errorMessage);
        }
        console.error("Failed to unlock locked amount:", error);
    }
};


  useEffect(() => {
    if (currentAccount) {
      fetchLockerStatus();
    }
  }, [currentAccount , network]);

  const formatNumber = (value: number) => {
    return (value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const shortenLockerId = (lockerId: string | any[]) => {
    if (!lockerId) return '';
    const start = lockerId.slice(0, 4);
    const end = lockerId.slice(-5);
    return `${start}.....${end}`;
  };

  return (
    <>   <Layout><LayoutHeader>
      <div className='ml-auto flex items-center space-x-4'>
        <UserNav />
      </div>
    </LayoutHeader>
      <div className="flex">
        <Sidebar2 isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className="flex-1">
          <div className="container mx-auto p-2 pt-10  text-white">
            <ToastContainer />
            <div className=" justify-center items-center ">
              <div className=" rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center">My Lockers</h2>
                <div>
                  <div className="overflow-x-auto">
                    <Table className="min-w-full  text-white">
                      <TableHeader className="">
                        <TableRow>
                          <TableHead>Locker ID</TableHead>
                          <TableHead>Coin Name</TableHead> 
                          <TableHead>Copy ID</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Unlocked</TableHead>
                          <TableHead>Duration (days)</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lockers.map((locker, index) => {
                          const canUnlock = Date.now() >= locker.start + locker.duration * (24 * 60 * 60 * 1000);
                          return (
                            <TableRow className="font-bold  text-white" key={locker.id.id || index}>
                              <TableCell>{shortenLockerId(locker.id.id)}</TableCell>
                              <TableCell>{locker.coinName}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Tooltip message={"Copy"}>
                                    <div className="flex items-center">
                                      <button
                                        className="ml-2 text-white hover:text-gray-300 justify-center align-middle"
                                        onClick={() => navigator.clipboard.writeText(locker.id.id)}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell>{locker.start ? new Date(locker.start).toLocaleString() : 'N/A'}</TableCell>
                              <TableCell>{formatNumber(locker.balance)}</TableCell>
                              <TableCell className="text-red-600">{formatNumber(locker.unlocked)}</TableCell>
                              <TableCell>{locker.duration.toFixed(2)}</TableCell>
                              <TableCell>
                                <button
                                   className={`bg-green-400 text-black px-4 py-2 rounded  ${!canUnlock || locker.unlocked >= locker.balance ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => unlockLockedAmount(locker.id.id, locker.lockerType)}
        disabled={!canUnlock || locker.unlocked >= locker.balance}
                                >
                                  Unlock Now
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div></Layout>
    </>
  );
};

export default MyLocker;
