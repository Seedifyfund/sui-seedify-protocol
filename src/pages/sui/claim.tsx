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
  admin: string;
  immediate_transfer_claimed: boolean;
  immediate_transfer_balance: number;
  immediate_claim_start: number;
  claim_renounced: boolean;
  renouncement_start: number; // New field for renouncement start
  renouncement_end: number;   // New field for renouncement end
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
            const fields = wallet?.content?.fields;
            const releasable = await getReleasableAmount(fields.id.id);
      
            const fullType = wallet.content.type;
            const typeMatch = fullType.match(/<(.+)>/);
            const walletType = typeMatch ? typeMatch[1] : null;
      
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
              admin: fields.admin,
              immediate_transfer_claimed: fields.immediate_transfer_claimed,
              immediate_transfer_balance: Number(fields.immediate_transfer_balance) / 1_000_000_000,
              immediate_claim_start: Number(fields.immediate_claim_start),
              claim_renounced: fields.claim_renounced,
              renouncement_start: Number(fields.renouncement_start), // Extract renouncement start
              renouncement_end: Number(fields.renouncement_end),     // Extract renouncement end
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
    const vestedAmount = linear_vested_amount(wallet.start, wallet.duration * (24 * 60 * 60 * 1000), wallet.balance * 1_000_000_000, wallet.released * 1_000_000_000, currentTime);
    const claimable = vestedAmount - (wallet.released * 1_000_000_000);

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
          txBlock.object("0xe70493fe1b9eb120b1b4f91b3ff33f66f14616ffe1611099a5b336cf5f407acb"),
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
      toast.info("Claiming immediate transfer...");
      const txBlock = new TransactionBlock();
      txBlock.setGasBudget(10000000);
      txBlock.moveCall({
        target: `${seedifyProtocolAddress}::seedifyprotocol::claim_immediate_transfer`,
        arguments: [
          txBlock.object(walletId),
          txBlock.object("0xe70493fe1b9eb120b1b4f91b3ff33f66f14616ffe1611099a5b336cf5f407acb"),
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
      <TableHead>Immediate Transfer Balance</TableHead>
      <TableHead>Immediate Claim Start</TableHead>
      <TableHead>Renouncement Start</TableHead> {/* New Column */}
      <TableHead>Renouncement End</TableHead>   {/* New Column */}
      <TableHead>Claim Interval (days)</TableHead>
      <TableHead>Last Released</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {wallets.map((wallet, index) => {
      const claimableAmount = calculateClaimableAmount(wallet);
      const isImmediateClaimable = !wallet.immediate_transfer_claimed && Date.now() >= wallet.immediate_claim_start;
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
          <TableCell className="text-yellow-500">{formatNumber(wallet.immediate_transfer_balance)}</TableCell>
          <TableCell>{wallet.immediate_claim_start ? new Date(wallet.immediate_claim_start).toLocaleString() : 'N/A'}</TableCell>
          <TableCell>{wallet.renouncement_start ? new Date(wallet.renouncement_start).toLocaleString() : 'N/A'}</TableCell> {/* New Cell */}
          <TableCell>{wallet.renouncement_end ? new Date(wallet.renouncement_end).toLocaleString() : 'N/A'}</TableCell>     {/* New Cell */}
          <TableCell>{wallet.claim_interval.toFixed(5)}</TableCell>
          <TableCell>{wallet.last_claimed ? new Date(wallet.last_claimed).toLocaleString() : 'N/A'}</TableCell>
          <TableCell>
            <div className="flex space-x-2">
              <button
                className={`bg-green-400 text-black px-4 py-2 rounded ${claimableAmount === 0 || wallet.claim_renounced ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => claimVestedAmount(wallet.id.id, wallet.walletType)}
                disabled={claimableAmount === 0 || wallet.claim_renounced}
              >
                Claim Now
              </button>
              <button
                className={`bg-blue-400 text-black px-4 py-2 rounded ${isImmediateClaimable ? '' : 'opacity-50 cursor-not-allowed'}`}
                onClick={() => claimImmediateTransfer(wallet.id.id, wallet.walletType)}
                disabled={!isImmediateClaimable}
              >
                Claim Immediate
              </button>
              <button
                className={`bg-red-400 text-black px-4 py-2 rounded ${wallet.immediate_transfer_claimed || wallet.claim_renounced ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => renounceOwnership(wallet.id.id, wallet.walletType)}
                disabled={wallet.immediate_transfer_claimed || wallet.claim_renounced}
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
