"use client";
import Image from "next/image";
import { useRouter } from "next/router";
import { Copy } from "lucide-react";
import React, { useState, useEffect } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
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
import axios from 'axios';

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
}

const Alvestings: React.FC = () => {
  const client = new SuiClient({ url: getFullnodeUrl("testnet") });
  const [wallets, setWallets] = useState<WalletFields[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse
  const packageId = "0x4afa11807187e5c657ffba3b552fdbb546d6e496ee5591dca919c99dd48d3f27";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/vesting");
        const accounts = response.data.allVesting;
        const addresses = accounts.map((account: any) => account.receiver);

        fetchVestingStatus(addresses);
      } catch (error) {
        console.error("Error fetching vesting data:", error);
      }
    };

    fetchData();
  }, []);

  const fetchVestingStatus = async (addresses: string[]) => {
    try {
      toast.info("Fetching vesting status...");

      const allWallets: WalletFields[] = [];

      for (const address of addresses) {
        const response: any = await client.getOwnedObjects({
          owner: address,
          filter: {
            StructType: `${packageId}::torqueprotocol::Wallet`
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
              console.log('Wallet Object:', JSON.stringify(wallet, null, 2)); // Log the entire wallet object

              const fields = wallet?.content?.fields;
              const releasable = await getReleasableAmount(fields.id.id);

              // Extract walletType from the full type string
              const fullType = wallet.content.type;
              const typeMatch = fullType.match(/<(.+)>/);
              const walletType = typeMatch ? typeMatch[1] : null;

              console.log('Extracted Wallet Type:', walletType); // Debug logging

              // Fetch coin metadata to get coinName
              const coinMetadata = await client.getCoinMetadata({ coinType: walletType });
              const coinName = coinMetadata?.name ?? ""; // Add null check for coinMetadata

              return {
                id: { id: fields.id.id },
                balance: Number(fields.balance) / 1_000_000_000, // Adjust balance
                released: Number(fields.released) / 1_000_000_000, // Adjust released
                duration: Number(fields.duration) / (24 * 60 * 60 * 1000), // Convert to days
                claim_interval: Number(fields.claim_interval) / (24 * 60 * 60 * 1000), // Convert to days
                last_claimed: Number(fields.last_claimed),  // Store last claimed timestamp
                start: Number(fields.start),
                releasable: Number(releasable) / 1_000_000_000, // Adjust releasable amount
                walletType: walletType, // Use the extracted walletType
                coinName: coinName, // Add coinName
              } as WalletFields;
            } catch (error) {
              console.log('Error fetching wallet details:', error);
              return null;
            }
          })
        );

        allWallets.push(...fetchedWallets.filter(wallet => wallet !== null) as WalletFields[]);
      }

      setWallets(allWallets);
      toast.success("Vesting status fetched successfully!");
    } catch (error) {
      toast.error("Failed to fetch vesting status.");
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

  const linear_vested_amount = (start: number, duration: number, balance: number, already_released: number, timestamp: number): number => {
    if (timestamp < start) return 0;
    if (timestamp > start + duration) return balance + already_released;

    const vestedAmount = ((balance + already_released) * (timestamp - start)) / duration;

    return vestedAmount;
  };

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
    <>
      <div className="flex">
        <Sidebar2 isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className="flex-1">
          <div className="container mx-auto p-2 pt-10 text-white">
            <ToastContainer />
            <div className="justify-center items-center">
              <div className="rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-center">All Vestings</h2>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wallets.map((wallet, index) => {
                          const claimableAmount = (wallet.releasable - wallet.released);
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
    </>
  );
};

export default Alvestings;
