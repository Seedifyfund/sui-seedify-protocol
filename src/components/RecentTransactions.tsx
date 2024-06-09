import React, { useState, useEffect } from 'react';
import { SuiClient, getFullnodeUrl, SuiObjectResponse } from '@mysten/sui.js/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNetwork } from '../components/NetworkContext'; // Adjust the path as necessary
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Layout, LayoutHeader } from '@/components/custom/layout';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface RecentTransactionsProps {
    triggerFetch: boolean; // Add a prop to trigger the fetch
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ triggerFetch }) =>  {
    const currentAccount = useCurrentAccount();
    const { network } = useNetwork(); // Use selectedNetwork from context
    const client = new SuiClient({ url: getFullnodeUrl(network) });

    const [transactions, setTransactions] = useState<any[]>([]);
    const [coinDetails, setCoinDetails] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 10;

    useEffect(() => {
        if (currentAccount) {
            fetchTransactions(currentAccount.address);
        }
    }, [currentAccount, network, triggerFetch]); // Include network in the dependency array

    const fetchTransactions = async (address: string) => {
        try {
            const recentTransactions = await client.queryTransactionBlocks({
                filter: { ToAddress: address }
            });

            console.log('Fetched recent transactions:', recentTransactions);

            const transactionDetails = await Promise.all(
                recentTransactions.data.map(async (tx: any) => {
                    const details = await client.getTransactionBlock({
                        digest: tx.digest,
                        options: { showInput: true, showEffects: true }
                    });
                    console.log('Transaction details for digest', tx.digest, ':', details);
                    return details;
                })
            );

            setTransactions(transactionDetails);
            fetchCoinDetails(transactionDetails);
        } catch (e) {
            console.error('Failed to fetch transactions:', e);
        }
    };

    const fetchCoinDetails = async (transactions: any[]) => {
        try {
            const coins = await Promise.all(
                transactions.map(async (tx) => {
                    if (tx.effects) {
                        const createdObjects = tx.effects.created || [];
                        const coinObjects = await Promise.all(
                            createdObjects.map(async (obj: any) => {
                                const objectId = obj.reference.objectId;
                                const objectDetails: SuiObjectResponse = await client.getObject({
                                    id: objectId,
                                    options: { showType: true, showContent: true }
                                });

                                // Ensure we are only picking up coin types
                                if (objectDetails.data?.content?.dataType === 'moveObject' && objectDetails.data.content?.type.includes('::coin::Coin')) {
                                    const coinType = objectDetails.data.content.type;

                                    // Fetch coin metadata to get coinName and decimals
                                    const coinMetadata = await client.getCoinMetadata({ coinType });
                                    const coinNameMatch = coinType.match(/<([^>]+)>/);
                                    const coinName = coinNameMatch ? coinNameMatch[1].split('::').pop() : "Unknown Coin";
                                    const decimals = coinMetadata?.decimals ?? 0;

                                    return { coinType, coinName };
                                }
                                return null;
                            })
                        );
                        return coinObjects.filter((coin: any) => coin !== null);
                    }
                    return [];
                })
            );
            setCoinDetails(coins.flat());
        } catch (e) {
            console.error('Failed to fetch coin details:', e);
        }
    };

    const formatAge = (timestampMs: number) => {
        if (!timestampMs) return 'N/A';
        const now = Date.now();
        const diffMs = now - timestampMs;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${diffHrs}h ${diffMins}m ago`;
    };

    const getTransactionLink = (digest: string) => {
        const baseUrl = network === 'mainnet'
            ? 'https://suiscan.xyz/mainnet/tx/'
            : 'https://suiscan.xyz/testnet/tx/';
        return `${baseUrl}${digest}`;
    };

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    // Get current transactions
    const indexOfLastTransaction = currentPage * transactionsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
    const currentTransactions = transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

    return (
        <div>
            <div className="flex-1">
                <div className=" mx-auto p-2 pt-10 text-white">
                    <ToastContainer />
                    <div className="justify-center items-center">
                        <div className="rounded-lg shadow-lg ">
                            <h2 className="text-2xl font-semibold mb-4 text-center">RECENT TRANSACTIONS</h2>
                            <div className="overflow-x-auto">
                                <Table className="min-w-full ">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Transaction ID</TableHead>
                                            <TableHead>Age</TableHead>
                                            <TableHead>Sender</TableHead>
                                            <TableHead>Coin Name</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentTransactions.map((tx, idx) => (
                                            <TableRow className=" text-white" key={idx}>
                                                <TableCell>
                                                    <a href={getTransactionLink(tx.digest)} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                                                        {tx.digest}
                                                    </a>
                                                </TableCell>
                                                <TableCell>{formatAge(tx.timestampMs)}</TableCell>
                                                <TableCell>{tx.transaction?.data?.sender}</TableCell>
                                                <TableCell>{coinDetails[idx]?.coinName || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious href="#" onClick={() => paginate(currentPage - 1)} />
                                    </PaginationItem>
                                    {[...Array(Math.ceil(transactions.length / transactionsPerPage)).keys()].map(number => (
                                        <PaginationItem key={number + 1}>
                                            <PaginationLink href="#" onClick={() => paginate(number + 1)} isActive={number + 1 === currentPage}>
                                                {number + 1}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext href="#" onClick={() => paginate(currentPage + 1)} />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecentTransactions;
