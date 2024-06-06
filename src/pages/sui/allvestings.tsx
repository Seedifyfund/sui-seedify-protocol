"use client";
import React, { useState, useEffect } from "react";
import Navbar from "../../components/custom/navbar";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Tooltip from "@/components/custom/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy } from "lucide-react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { routeProtection } from "@/utils/routeProtection";

interface WalletFields {
  id: { id: string };
  balance: number;
  released: number;
  duration: number;
  claim_interval: number;
  last_claimed: number;
  releasable: number;
  start: number;
  type: string;
  receiver: string;
  vestingStage: string; 
  startDate: string; 
}

const AllAccounts: React.FC = () => {
  const client = new SuiClient({ url: getFullnodeUrl("testnet") });
  const [wallets, setWallets] = useState<WalletFields[]>([]);
  const [vestedAccounts, setVestedAccounts] = useState<WalletFields[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
		const checkAdminAccess = async () => {
			const { isRedirect } = await routeProtection(currentAccount);
			setIsAdmin(!isRedirect);

			if (isRedirect) {
				router.push("/");
			}
		};

		checkAdminAccess();
  }, [currentAccount, router]);


  const packageId =
    "0x80a95a5eeff30229651beea79cc7a200b945df47500b05cb0b3bb06d416a0e1e";
  const walletType =
    "0x01f3e92274bc3972c66355e3e908928925b23040a6c967dffec10305954750df::artfi::ARTFI";

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await axios.get("/api/Vesting");
          const accounts = response.data.allVesting.map((account: any) => ({
            ...account,
            id: { id: account.id }, // Ensure id is an object with an id property
          }));
          console.log("Fetched vesting accounts:", accounts);
          setVestedAccounts(accounts);
          const addrs = accounts.map((account: any) => account.receiver);
          setAddresses(addrs);
          console.log("Extracted addresses:", addrs);
        } catch (error) {
          console.error("Error fetching vesting data:", error);
        }
      };
      fetchData();
    }, []);
    
    
    

    useEffect(() => {
      if (addresses.length > 0) {
        console.log("Addresses updated, fetching all accounts");
        fetchAllAccounts();
      }
    }, [addresses]);
    
    const fetchAllAccounts = async () => {
      try {
        const allWallets: WalletFields[] = [];
        const seenIds = new Set<string>();
    
        for (const address of addresses) {
          console.log(`Fetching owned objects for address: ${address}`);
          const response: any = await client.getOwnedObjects({
            owner: address,
            filter: {
              StructType: `${packageId}::artfivesting::Wallet<${walletType}>`,
            },
            options: {
              showType: true,
              showContent: true,
            },
          });
    
          console.log(`Response for address ${address}:`, response);
    
          if (response && response.data) {
            const fetchedWallets = await Promise.all(
              response.data.map(async (obj: any) => {
                const walletResponse: any = await client.getObject({
                  id: obj.data.objectId,
                  options: { showContent: true },
                });
    
                console.log(`Wallet response for object ${obj.data.objectId}:`, walletResponse);
    
                if (walletResponse && walletResponse.data) {
                  const wallet = walletResponse.data;
                  const fields = wallet?.content?.fields;
                  const releasable = await getReleasableAmount(fields.id.id);
    
                  return {
                    id: { id: fields.id.id },
                    balance: Number(fields.balance) / 1_000_000_000,
                    released: Number(fields.released) / 1_000_000_000,
                    duration: Number(fields.duration) / (24 * 60 * 60 * 1000),
                    claim_interval: Number(fields.claim_interval) / (24 * 60 * 60 * 1000),
                    last_claimed: Number(fields.last_claimed),
                    start: Number(fields.start),
                    releasable: Number(releasable) / 1_000_000_000,
                    type: obj.data.type,
                    receiver: address,
                    vestingStage: "",
                    startDate: "",
                  } as WalletFields;
                } else {
                  return null;
                }
              })
            );
    
            for (const wallet of fetchedWallets.filter((wallet) => wallet !== null)) {
              if (!seenIds.has(wallet.id.id)) {
                allWallets.push(wallet);
                seenIds.add(wallet.id.id);
              }
            }
          }
        }
    
        console.log("Fetched all wallets:", allWallets);
        setWallets(allWallets);
        toast.success("All accounts fetched successfully!");
      } catch (error) {
        toast.error("Failed to fetch all accounts.");
        console.error("Failed to fetch all accounts:", error);
      }
    };
    
    // Log the combinedData for debugging
    useEffect(() => {
      if (wallets.length > 0 && vestedAccounts.length > 0) {
        const combinedData = wallets.map((wallet) => {
          const matchingAccount = vestedAccounts.find(
            (account) => account.id.id === wallet.id.id
          );
          const vestingStage = matchingAccount ? matchingAccount.vestingStage : "N/A";
          const startDate = matchingAccount ? matchingAccount.startDate : "N/A";
          console.log(`Wallet ID ${wallet.id.id} - Vesting Stage: ${vestingStage}, Start Date: ${startDate}`);
          return {
            ...wallet,
            vestingStage,
            startDate,
          };
        });
        console.log("Combined Data:", combinedData);
      }
    }, [wallets, vestedAccounts]);
    
  
  
  

  const getReleasableAmount = async (walletId: string) => {
    try {
      const walletResponse: any = await client.getObject({
        id: walletId,
        options: { showContent: true },
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

      const releasable = linear_vested_amount(
        start,
        duration,
        balance,
        released,
        current_time
      );

      return releasable;
    } catch (error) {
      console.error("Failed to fetch releasable amount:", error);
      return 0;
    }
  };

  const linear_vested_amount = (
    start: number,
    duration: number,
    balance: number,
    already_released: number,
    timestamp: number
  ): number => {
    if (timestamp < start) return 0;
    if (timestamp > start + duration) return balance;

    const vestedAmount = (balance * (timestamp - start)) / duration;

    return vestedAmount;
  };

  const formatNumber = (value: number) => {
    return (value || 0).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const shortenWalletId = (walletId: string | any[]) => {
    if (!walletId) return "";
    const start = walletId.slice(0, 4);
    const end = walletId.slice(-5);
    return `${start}.....${end}`;
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

    return Math.max(claimable, 0) / 1_000_000_000;
  };

  const totalWallets = wallets.length;
  const totalBalance = wallets.reduce((acc, wallet) => acc + wallet.balance, 0);
  const totalReleased = wallets.reduce((acc, wallet) => acc + wallet.released, 0);
  const totalClaimable = wallets.reduce((acc, wallet) => acc + calculateClaimableAmount(wallet), 0);
  const averageDuration =
    wallets.reduce((acc, wallet) => acc + wallet.duration, 0) / totalWallets || 0;
  const averageClaimInterval =
    wallets.reduce((acc, wallet) => acc + wallet.claim_interval, 0) / totalWallets || 0;

    const combinedData = wallets.map((wallet) => {
      const matchingAccount = vestedAccounts.find(
        (account) => new Date(account.startDate).getTime() === wallet.start
      );
      const vestingStage = matchingAccount ? matchingAccount.vestingStage : "N/A";
      const startDate = matchingAccount ? matchingAccount.startDate : "N/A";
      console.log(`Wallet ID ${wallet.id.id} - Vesting Stage: ${vestingStage}, Start Date: ${startDate}`);
      return {
        ...wallet,
        vestingStage,
        startDate,
      };
    });
    
    
    
    

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-2 pt-10">
        <ToastContainer />
        <div className="flex justify-center items-center min-h-screen">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-center">
              All Vesting Wallets
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Total Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">{totalWallets}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Total Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">
                    {formatNumber(totalBalance)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Total Released</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">
                    {formatNumber(totalReleased)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Total Claimable</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">
                    {formatNumber(totalClaimable)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Average Duration (days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">
                    {averageDuration.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-l from-indigo-600 via-blue-500 to-cyan-400">
                <CardHeader>
                  <CardTitle>Average Claim Interval (days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-left font-bold text-2xl">
                    {averageClaimInterval.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vesting Stage</TableHead>
                    <TableHead>Wallet ID</TableHead>
                    <TableHead>Copy ID</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>Claimable Amount</TableHead>
                    <TableHead>Duration (days)</TableHead>
                    <TableHead>Claim Interval (days)</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedData.map((wallet, index) => {
                    const claimableAmount = calculateClaimableAmount(wallet);
                    return (
                      <TableRow key={wallet?.id?.id || index}>
                        <TableCell>{wallet.vestingStage || "N/A"}</TableCell>
                        <TableCell>{shortenWalletId(wallet.id.id)}</TableCell>
                        <TableCell>
                          <Tooltip message={"Copy"}>
                            <div className="flex items-center">
                              <button
                                className="ml-2 text-gray-500 hover:text-gray-700"
                                onClick={() =>
                                  navigator.clipboard.writeText(wallet.id.id)
                                }
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {wallet.start
                            ? new Date(wallet.start).toLocaleString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>{formatNumber(wallet.balance)}</TableCell>
                        <TableCell className="text-red-600">
                          {formatNumber(wallet.released)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {formatNumber(claimableAmount)}</TableCell>
                        <TableCell>{wallet.duration.toFixed(2)}</TableCell>
                        <TableCell>
                          {wallet.claim_interval.toFixed(2)}</TableCell>
                        <TableCell>
                          {wallet.last_claimed
                            ? new Date(wallet.last_claimed).toLocaleString()
                            : "N/A"}
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
    </>
  );
};

export default AllAccounts;
