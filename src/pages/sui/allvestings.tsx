"use client";
import React, { useState, useEffect } from "react";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Sidebar2 from '../../components/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Tooltip from "@/components/custom/Tooltip";
import { Copy } from "lucide-react";
import axios from "axios";

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
  coinName: string;
}

const AllVestings: React.FC = () => {
  const client = new SuiClient({ url: getFullnodeUrl("testnet") });
  const [wallets, setWallets] = useState<WalletFields[]>([]);
  const [vestedAccount, setVestedAccounts] = useState<WalletFields[]>([]);
  const [add, setAdd] = useState<any[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse
  const packageId =
    "0x4afa11807187e5c657ffba3b552fdbb546d6e496ee5591dca919c99dd48d3f27";
  const walletType =
    "0x01f3e92274bc3972c66355e3e908928925b23040a6c967dffec10305954750df::artfi::ARTFI";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("/api/Vesting");
        const accounts = response.data.allVesting;
        setVestedAccounts(accounts);
        console.log(accounts);

        // Extract and set receiver's addresses
        const addresses = accounts.map(
          (account: any) => account.receiver
        );
        setAdd(addresses);

        // Log each receiver's address
        addresses.forEach((address: any) => {
          console.log("Receiver's Address:", address);
        });
      } catch (error) {
        console.error("Error fetching vesting data:", error);
      }
    };

    fetchData();
  }, []);

  const fetchAllAccounts = async () => {
    try {
      // toast.info("Fetching all accounts...");
      console.log("Fetching all accounts...");

      const allWallets: WalletFields[] = [];

      for (const address of add) { // Use the addresses from the state
        console.log(`Fetching objects for address: ${address}`);
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

        console.log(`Full response for address ${address}:`, response);

        if (response && response.data) {
          const fetchedWallets = await Promise.all(
            response.data.map(async (obj: any) => {
              const walletResponse: any = await client.getObject({
                id: obj.data.objectId,
                options: { showContent: true },
              });

              console.log(
                `Wallet response for object ${obj.data.objectId}:`,
                walletResponse
              );

              if (walletResponse && walletResponse.data) {
                const wallet = walletResponse.data;
                const fields = wallet?.content?.fields;
                const releasable = await getReleasableAmount(
                  fields.id.id
                );
                const coinMetadata = await client.getCoinMetadata({ coinType: walletType });
                const coinName = coinMetadata?.name ?? ""; // Add null check for coinMetadata

                return {
                  id: { id: fields.id.id },
                  balance: Number(fields.balance) / 1000000000, // Adjust balance
                  released: Number(fields.released) / 1000000000, // Adjust released
                  duration: Number(fields.duration) /
                    (24 * 60 * 60 * 1000), // Convert to days
                  claim_interval: Number(fields.claim_interval) /
                    (24 * 60 * 60 * 1000), // Convert to days
                  last_claimed: Number(fields.last_claimed), // Store last claimed timestamp
                  start: Number(fields.start),
                  releasable: Number(releasable) / 1000000000, // Adjust releasable amount
                  type: obj.data.type,
                  coinName: coinName, // Add coinName
                } as unknown as WalletFields;
              } else {
                return null;
              }
            })
          );

          console.log(
            `Fetched wallets for address ${address}:`,
            fetchedWallets
          );

          allWallets.push(
            ...fetchedWallets.filter((wallet) => wallet !== null)
          );
        }
      }

      setWallets(allWallets);
      toast.success("All accounts fetched successfully!");
      console.log("All accounts fetched successfully!");
    } catch (error) {
      toast.error("Failed to fetch all accounts.");
      console.error("Failed to fetch all accounts:", error);
    }
  };

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
    if (timestamp > start + duration) return balance + already_released;

    const vestedAmount =
      ((balance + already_released) * (timestamp - start)) / duration;

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
    const elapsed = Math.max(currentTime - wallet.start, 0);
    const elapsedIntervals = Math.floor(
      elapsed / (wallet.claim_interval * 24 * 60 * 60 * 1000)
    ); // Convert days to milliseconds
    const totalIntervals = Math.floor(
      wallet.duration / wallet.claim_interval
    );
    const claimablePerInterval = wallet.balance / totalIntervals;
    const claimable =
      claimablePerInterval * elapsedIntervals - wallet.released;

    return Math.max(claimable, 0);
  };

  useEffect(() => {
    fetchAllAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add]); // Fetch accounts when `add` state is updated

  return (
    <>   <div className="flex"> 
     <div className='container mx-auto p-2 pt-10'>
				<ToastContainer />
				<div className=' justify-center items-center min-h-screen'>
					<div className=' rounded-lg shadow-lg p-6'>
						<h2 className='text-2xl font-semibold mb-4 text-center'>
							All Accounts
						</h2>
						<div className='overflow-x-auto'>
							<Table className="overflow-scroll  ">
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
										<TableHead>
											Claim Interval (days)
										</TableHead>
										<TableHead>Start Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{wallets.map((wallet, index) => {
										const claimableAmount =
											calculateClaimableAmount(wallet);

										return (
											<TableRow
												key={wallet.id.id || index}>
												<TableCell>
													{shortenWalletId(
														wallet.id.id
													)}
												</TableCell>
                        <TableCell>{wallet.coinName}</TableCell>
												<TableCell>
													<Tooltip message={"Copy"}>
														<div className='flex items-center'>
															<button
																className='ml-2 text-gray-500 hover:text-gray-700'
																onClick={() =>
																	navigator.clipboard.writeText(
																		wallet
																			.id
																			.id
																	)
																}>
																<Copy className='h-4 w-4' />
															</button>
														</div>
													</Tooltip>
												</TableCell>
												<TableCell>
													{wallet.start
														? new Date(
																wallet.start
														  ).toLocaleString()
														: "N/A"}
												</TableCell>
												<TableCell>
													{formatNumber(
														wallet.balance
													)}
												</TableCell>
												<TableCell className='text-red-600'>
													{formatNumber(
														wallet.released
													)}
												</TableCell>
												<TableCell className='text-green-600'>
													{formatNumber(
														claimableAmount
													)}
												</TableCell>
												<TableCell>
													{wallet.duration.toFixed(2)}
												</TableCell>
												<TableCell>
													{wallet.claim_interval.toFixed(
														5
													)}
												</TableCell>
												<TableCell>
													{wallet.last_claimed
														? new Date(
																wallet.last_claimed
														  ).toLocaleString()
														: "N/A"}
												</TableCell>
												{/* <TableCell>{wallet.type}</TableCell> */}
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					</div>
				</div>
			</div>
      <Sidebar2 isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} /></div>
    </>
  );
};

export default AllVestings;
