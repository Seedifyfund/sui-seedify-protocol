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
import { useNetwork } from '../../components/NetworkContext';
import { Layout, LayoutHeader } from '@/components/custom/layout';
import { UserNav } from '@/components/user-nav';

interface WalletFields {
  id: { id: string };
  balance: number;
  released: number;
  duration: number;
  claim_interval: number;
  last_claimed: number;
  releasable: number;
  start: number;
  walletType: string;
  coinName: string;
  admin: string;  // Admin address stored in the Wallet struct
  immediate_transfer_time: number; // New field for immediate transfer time
  immediate_transfer_claimed: boolean; // New field for checking if immediate transfer has been claimed
}

const Claim: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const signAndExecuteTransactionBlock = useSignAndExecuteTransactionBlock();
  const { network } = useNetwork();
  const client = new SuiClient({ url: getFullnodeUrl(network) });
  const [wallets, setWallets] = useState<WalletFields[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const seedifyProtocolAddress = network === 'mainnet'
    ? import.meta.env.VITE_MAINNET_SEEDIFY_ADDRESS
    : import.meta.env.VITE_TESTNET_SEEDIFY_ADDRESS;

  const fetchVestingStatus = async () => {
    try {
      const response: any = await client.getOwnedObjects({
        owner: currentAccount?.address || "",
        filter: {
          StructType: `${seedifyProtocolAddress}::seedifyprotocol::Wallet`
        },
        options: {
          showType: true,
          showContent: true,
        },
      });

      const filteredObjects = response.data.filter((obj: any) => obj.data?.objectId);

      const fetchedWallets = await Promise.all(
        filteredObjects.map(async (obj: any) => {
          try {
            const walletResponse: any = await client.getObject({
              id: obj.data.objectId,
              options: { showContent: true },
            });

            const wallet = walletResponse.data;
            console.log('Wallet Object:', JSON.stringify(wallet, null, 2));

            const fields = wallet?.content?.fields;
            const releasable = await getReleasableAmount(fields.id.id);

            const fullType = wallet.content.type;
            const typeMatch = fullType.match(/<(.+)>/);
            const walletType = typeMatch ? typeMatch[1] : null;

            console.log('Extracted Wallet Type:', walletType);

            const coinMetadata = await client.getCoinMetadata({ coinType: walletType });
            const coinName = coinMetadata?.name ?? "";

            return {
              id: { id: fields.id.id },
              balance: Number(fields.balance) / 1_000_000_000,
              released: Number(fields.released) / 1_000_000_000,
              duration: Number(fields.duration) / (24 * 60 * 60 * 1000),
              claim_interval: Number(fields.claim_interval) / (24 * 60 * 60 * 1000),
              last_claimed: Number(fields.last_claimed),
              start: Number(fields.start),
              releasable: Number(releasable) / 1_000_000_000,
              walletType: walletType,
              coinName: coinName,
              admin: fields.admin,  // Extract the admin address
              immediate_transfer_time: Number(fields.immediate_transfer_time), // Add this
              immediate_transfer_claimed: fields.immediate_transfer_claimed, // Add this
            } as WalletFields;
          } catch (error) {
            console.log('Error fetching wallet details:', error);
            return null;
          }
        })
      );

      setWallets(fetchedWallets.filter(wallet => wallet !== null) as WalletFields[]);
    } catch (error) {
      console.error("Failed to fetch vesting status:", error);
    }
  };

  const getReleasableAmount = async (walletId: string) => {
    try {
      const walletResponse: any = await client.getObject({
        id: walletId,
        options: { showContent: true }
      });

      const wallet = walletResponse.data;
      const current_time = Date.now();
      const start = wallet?.content?.fields?.start;
      const duration = wallet?.content?.fields?.duration;
      const balance = wallet?.content?.fields?.balance;
      const released = wallet?.content?.fields?.released;

      if (!start || !duration || !balance || !released) {
        throw new Error("Incomplete wallet data");
      }

      const releasable = linear_vested_amount(start, duration, balance, released, current_time);

      return releasable;
    } catch (error) {
      console.error("Failed to fetch releasable amount:", error);
      return 0;
    }
  };

  const calculateClaimableAmount = (wallet: WalletFields): number => {
    const currentTime = Date.now();
    const vestedAmount = linear_vested_amount(
      wallet.start,
      wallet.duration * (24 * 60 * 60 * 1000),
      wallet.balance * 1_000_000_000,
      wallet.released * 1_000_000_000,
      currentTime
    );
    const claimable = vestedAmount - wallet.released * 1_000_000_000;

    // If the immediate transfer time has passed and it hasn't been claimed yet
    if (currentTime >= wallet.immediate_transfer_time && !wallet.immediate_transfer_claimed) {
      return Math.max(claimable, wallet.balance) / 1_000_000_000;
    }

    return Math.max(claimable, 0) / 1_000_000_000;
  };

  const linear_vested_amount = (start: number, duration: number, balance: number, already_released: number, timestamp: number): number => {
    if (timestamp < start) return 0;
    if (timestamp > start + duration) return balance + already_released;

    const vestedAmount = ((balance + already_released) * (timestamp - start)) / duration;

    return vestedAmount;
  };

  const claimVestedAmount = async (walletId: string, walletType: string) => {
    try {
      toast.info("Claiming vested amount...");
      const txBlock = new TransactionBlock();
      txBlock.setGasBudget(10000000);
      txBlock.moveCall({
        target: `${seedifyProtocolAddress}::seedifyprotocol::entry_claim`,
        arguments: [
          txBlock.object(walletId),
          txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"), // Clock object ID
        ],
        typeArguments: [walletType],
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
        toast.error(errorMessage);
      } else {
        toast.success("Transaction successful.");
        fetchVestingStatus();
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "Transaction failed";
      toast.error(errorMessage);
      console.error("Failed to claim vested amount:", error);
    }
  };

  const claimImmediateTransfer = async (walletId: string, walletType: string) => {
    try {
      toast.info("Claiming immediate transfer amount...");
      const txBlock = new TransactionBlock();
      txBlock.setGasBudget(10000000);
      txBlock.moveCall({
        target: `${seedifyProtocolAddress}::seedifyprotocol::entry_claim_immediate_transfer`,
        arguments: [
          txBlock.object(walletId),
          txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"), // Clock object ID
        ],
        typeArguments: [walletType],
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
        toast.error(errorMessage);
      } else {
        toast.success("Immediate transfer claimed successfully.");
        fetchVestingStatus();
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "Transaction failed";
      toast.error(errorMessage);
      console.error("Failed to claim immediate transfer:", error);
    }
  };

  const renounceOwnership = async (walletId: string, walletType: string) => {
    try {
      toast.info("Renouncing ownership...");
      const txBlock = new TransactionBlock();
      txBlock.setGasBudget(10000000);
      txBlock.moveCall({
        target: `${seedifyProtocolAddress}::seedifyprotocol::renounce_claim`,
        arguments: [
          txBlock.object(walletId),
          txBlock.object("0x0000000000000000000000000000000000000000000000000000000000000006"), // Clock object ID
        ],
        typeArguments: [walletType],
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
        toast.error(errorMessage);
      } else {
        toast.success("Ownership renounced successfully.");
        fetchVestingStatus();
      }
    } catch (error) {
      const errorMessage = (error as Error).message || "Transaction failed";
      toast.error(errorMessage);
      console.error("Failed to renounce ownership:", error);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchVestingStatus();
    }
  }, [currentAccount, network]);

  const formatNumber = (value: number) => {
    return (value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const shortenWalletId = (walletId: string | any[]) => {
    if (!walletId) return '';
    const start = walletId.slice(0, 4);
    const end = walletId.slice(-5);
    return `${start}.....${end}`;
  };

  return (
    <Layout>
      <LayoutHeader>
        <div className='ml-auto flex items-center space-x-4'>
          <UserNav />
        </div>
      </LayoutHeader>
      <div className="flex">
        <Sidebar2 isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className="flex-1">
          <div className="container mx-auto p-2 pt-10 text-white">
            <ToastContainer />
            <div className=" justify-center items-center ">
              <div className="rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center">My Vestings</h2>
                <div>
                  <div className="overflow-x-auto">
                    <Table className="min-w-full text-white">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Wallet ID</TableHead>
                          <TableHead>Coin Name</TableHead>
                          <TableHead>Copy ID</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Released</TableHead>
                          <TableHead>Claimable Amount</TableHead>
                          <TableHead>Duration (days)</TableHead>
                          <TableHead>Claim Interval (days)</TableHead>
                          <TableHead>Last Released</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.map((wallet, index) => {
                          const claimableAmount = calculateClaimableAmount(wallet);
                          return (
                            <TableRow className="font-bold text-white" key={wallet.id.id || index}>
                              <TableCell>{shortenWalletId(wallet.id.id)}</TableCell>
                              <TableCell>{wallet.coinName}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Tooltip message={"Copy"}>
                                    <div className="flex items-center">
                                      <button
                                        className="ml-2 text-white hover:text-gray-300 justify-center align-middle"
                                        onClick={() => navigator.clipboard.writeText(wallet.id.id)}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </Tooltip>
                                </div>
                              </TableCell>
                              <TableCell>{wallet.start ? new Date(wallet.start).toLocaleString() : 'N/A'}</TableCell>
                              <TableCell>{formatNumber(wallet.balance)}</TableCell>
                              <TableCell className="text-red-600">{formatNumber(wallet.released)}</TableCell>
                              <TableCell className="text-green-600">{formatNumber(claimableAmount)}</TableCell>
                              <TableCell>{wallet.duration.toFixed(2)}</TableCell>
                              <TableCell>{wallet.claim_interval.toFixed(5)}</TableCell>
                              <TableCell>{wallet.last_claimed ? new Date(wallet.last_claimed).toLocaleString() : 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  {/* Regular Claim Button */}
                                  <button
                                    className={`bg-green-400 text-black px-4 py-2 rounded ${claimableAmount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => claimVestedAmount(wallet.id.id, wallet.walletType)}
                                    disabled={claimableAmount === 0}
                                  >
                                    Claim Now
                                  </button>

                                  {/* Immediate Transfer Claim Button */}
                                  {wallet.immediate_transfer_time && !wallet.immediate_transfer_claimed && Date.now() >= wallet.immediate_transfer_time && (
                                    <button
                                      className="bg-blue-400 text-black px-4 py-2 rounded"
                                      onClick={() => claimImmediateTransfer(wallet.id.id, wallet.walletType)}
                                    >
                                      Claim Immediate Transfer
                                    </button>
                                  )}

                                  {/* Renounce Ownership Button */}
                                  <button
                                    className="bg-red-400 text-black px-4 py-2 rounded"
                                    onClick={() => renounceOwnership(wallet.id.id, wallet.walletType)}
                                  >
                                    Renounce Ownership
                                  </button>
                                </div>
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
      </div>
    </Layout>
  );
};

export default Claim;
