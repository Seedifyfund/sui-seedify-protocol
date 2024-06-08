import { useEffect, useState } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, CheckCircle } from 'lucide-react';
import { useNetwork } from '../../../components/NetworkContext';

interface WalletFields {
  id: string;
  coinName: string;
  start: number;
}

export function RecentSales() {
  const currentAccount = useCurrentAccount();
  const { network } = useNetwork(); // Use selectedNetwork from context
	const client = new SuiClient({ url: getFullnodeUrl(network) });
  const [wallets, setWallets] = useState<WalletFields[]>([]);
  const [copiedWalletId, setCopiedWalletId] = useState<string | null>(null);

  const fetchVestingStatus = async () => {
    try {
      // toast.info("Fetching recent sales...");
      const response = await client.getOwnedObjects({
        owner: currentAccount?.address || '',
        filter: {
          StructType: '0x55a00fa668b4f75bb719a63b9c1a6db172f393a05e9d5c6479aa40a872d12702::torqueprotocol::Wallet',
        },
        options: {
          showType: true,
          showContent: true,
        },
      });

      const filteredObjects = response.data.filter((obj: any) => obj.data?.objectId);

      const fetchedWallets = await Promise.all(
        filteredObjects.map(async (obj: any) => {
          const walletResponse = await client.getObject({
            id: obj.data.objectId,
            options: { showContent: true },
          });

          const wallet = walletResponse.data;
          if (!wallet || !wallet.content || !('fields' in wallet.content)) return null;

          const fields = wallet.content.fields as any; // Use 'as any' to bypass strict type checks

          const fullType = wallet.content.type;
          const typeMatch = fullType.match(/<(.+)>/);
          const walletType = typeMatch ? typeMatch[1] : '';

          const coinMetadata = await client.getCoinMetadata({ coinType: walletType });
          const coinName = coinMetadata?.name ?? '';

          return {
            id: fields.id?.id,
            coinName,
            start: Number(fields.start),
          };
        })
      );

      setWallets(fetchedWallets.filter(wallet => wallet !== null) as WalletFields[]);
      // toast.success("Recent Vestings fetched successfully!");
    } catch (error) {
      // toast.error("Failed to fetch recent Vestings.");
      console.error('Failed to fetch vesting status:', error);
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchVestingStatus();
    }
  }, [currentAccount]);

  const shortenWalletId = (walletId: string) => {
    if (!walletId) return '';
    const start = walletId.slice(0, 4);
    const end = walletId.slice(-5);
    return `${start}.....${end}`;
  };

  const handleCopy = (walletId: string) => {
    navigator.clipboard.writeText(walletId);
    setCopiedWalletId(walletId);
    setTimeout(() => setCopiedWalletId(null), 2000); // Clear the copied state after 2 seconds
  };

  return (
    <div className='space-y-8 md:h-[400px] overflow-scroll'>
      <ToastContainer />
      <TooltipProvider>
        {wallets.map((wallet) => (
          <div className='flex items-center' key={wallet.id}>
            <div className='ml-4 space-y-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-sm font-medium leading-none flex items-center"
                    onClick={() => handleCopy(wallet.id)}
                  >
                    Wallet ID: {shortenWalletId(wallet.id)}
                    {copiedWalletId === wallet.id ? (
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy Wallet ID</p>
                </TooltipContent>
              </Tooltip>
              <p className='text-sm text-muted-foreground'>Coin Name:<span className='text-green-600'> {wallet.coinName}</span></p>
            </div>
            <div className='ml-auto text-xs font-medium'>
              Start Date: {wallet.start ? new Date(wallet.start).toLocaleString() : 'Invalid Date'}
            </div>
          </div>
        ))}
      </TooltipProvider>
    </div>
  );
}
