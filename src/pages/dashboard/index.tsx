import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Search } from '@/components/search';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import ThemeSwitch from '@/components/theme-switch';
import { UserNav } from '@/components/user-nav';
import { Layout, LayoutBody, LayoutHeader } from '@/components/custom/layout';
import { RecentSales } from './components/recent-sales';
import { Overview } from './components/overview';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNetwork } from '../../components/NetworkContext';
// import RecentTransactions from '@/components/RecentTransactions';
export default function Dashboard() {
  const currentAccount = useCurrentAccount();
  const { network } = useNetwork(); // Use selectedNetwork from context
	const client = new SuiClient({ url: getFullnodeUrl(network) });
  const seedifyProtocolAddress = network === 'mainnet'
    ? import.meta.env.VITE_MAINNET_SEEDIFY_ADDRESS
    : import.meta.env.VITE_TESTNET_SEEDIFY_ADDRESS;


  const [totalWallets, setTotalWallets] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalReleased, setTotalReleased] = useState(0);
  const [totalClaimable, setTotalClaimable] = useState(0);

  useEffect(() => {
    const fetchVestingStatus = async () => {
      try {
        const response = await client.getOwnedObjects({
          owner: currentAccount?.address || '',
          filter: {
            StructType: `${seedifyProtocolAddress}::seedifyprotocol::Wallet`,
            // 0x4afa11807187e5c657ffba3b552fdbb546d6e496ee5591dca919c99dd48d3f27 Testnet package ID for Torque Protocol
          },
          options: {
            showType: true,
            showContent: true,
          },
        });

        const filteredObjects = response.data.filter((obj: any) => obj.data?.objectId);

        let totalBalance = 0;
        let totalReleased = 0;
        let totalClaimable = 0;

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

              totalBalance += Number(fields.balance) / 1_000_000_000; // Adjust balance
              totalReleased += Number(fields.released) / 1_000_000_000; // Adjust released
              const claimableAmount = calculateClaimableAmount({
                start: Number(fields.start),
                duration: Number(fields.duration) / (24 * 60 * 60 * 1000), // Convert to days
                balance: Number(fields.balance) / 1_000_000_000, // Adjust balance
                released: Number(fields.released) / 1_000_000_000, // Adjust released
                releasable: Number(releasable) / 1_000_000_000, // Adjust releasable amount
                last_claimed: Number(fields.last_claimed),
                claim_interval: Number(fields.claim_interval) / (24 * 60 * 60 * 1000), // Convert to days
                id: { id: fields.id.id },
                walletType: wallet.content.type,
              });
              totalClaimable += claimableAmount;

              return {
                id: { id: fields.id.id },
                balance: Number(fields.balance) / 1_000_000_000, // Adjust balance
                released: Number(fields.released) / 1_000_000_000, // Adjust released
                duration: Number(fields.duration) / (24 * 60 * 60 * 1000), // Convert to days
                claim_interval: Number(fields.claim_interval) / (24 * 60 * 60 * 1000), // Convert to days
                last_claimed: Number(fields.last_claimed), // Store last claimed timestamp
                start: Number(fields.start),
                releasable: Number(releasable) / 1_000_000_000, // Adjust releasable amount
                walletType: wallet.content.type,
              };
            } catch (error) {
              console.log('Error fetching wallet details:', error);
              return null;
            }
          })
        );

        setTotalWallets(fetchedWallets.filter(wallet => wallet !== null).length);
        setTotalBalance(totalBalance);
        setTotalReleased(totalReleased);
        setTotalClaimable(totalClaimable);
      } catch (error) {
        console.error('Failed to fetch vesting status:', error);
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
          throw new Error('Incomplete wallet data');
        }

        const releasable = linear_vested_amount(start, duration, balance, released, current_time);

        return releasable;
      } catch (error) {
        console.error('Failed to fetch releasable amount:', error);
        return 0;
      }
    };

    const calculateClaimableAmount = (wallet: any): number => {
      const currentTime = Date.now();
      const vestedAmount = linear_vested_amount(wallet.start, wallet.duration * (24 * 60 * 60 * 1000), wallet.balance * 1_000_000_000, wallet.released * 1_000_000_000, currentTime);
      const claimable = vestedAmount - (wallet.released * 1_000_000_000);

      return Math.max(claimable, 0) / 1_000_000_000; // Convert back to original units
    };

    const linear_vested_amount = (start: number, duration: number, balance: number, already_released: number, timestamp: number): number => {
      if (timestamp < start) return 0;
      if (timestamp > start + duration) return balance + already_released;

      const vestedAmount = ((balance + already_released) * (timestamp - start)) / duration;

      return vestedAmount;
    };

    if (currentAccount) {
      fetchVestingStatus();
    }
  }, [currentAccount]);

  return (
    <Layout>
      <LayoutHeader>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <UserNav />
        </div>
      </LayoutHeader>

      <LayoutBody className='space-y-4'>
        <div className='flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
          Vesting Dashboard
          </h1>
        </div>
        <Tabs orientation='vertical' defaultValue='overview' className='space-y-4'>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Wallet IDs</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{totalWallets}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium '>Total Balance</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl text-blue-500 font-bold'>{totalBalance.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Released</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl text-orange-500 font-bold'>{totalReleased.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Claimable</CardTitle>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    className='h-4 w-4 text-muted-foreground'
                  >
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl text-green-500 font-bold'>{totalClaimable.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='pl-2'>
                    <Overview
              totalWallets={totalWallets}
              totalBalance={totalBalance}
              totalReleased={totalReleased}
              totalClaimable={totalClaimable}
            />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Vestings</CardTitle>
                  <CardDescription>
                   
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
              </Card>
            </div>
           
          </TabsContent>
        </Tabs>
      </LayoutBody>
    </Layout>
  );
}
