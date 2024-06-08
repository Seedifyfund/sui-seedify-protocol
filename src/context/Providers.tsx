import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { NetworkProvider, useNetwork } from '../components/NetworkContext'; // Adjust the path as necessary

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <InnerProviders>{children}</InnerProviders>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function InnerProviders({ children }: { children: ReactNode }) {
  const { network } = useNetwork();
  return (
    <SuiClientProvider networks={networkConfig} network={network}>
      <WalletProvider>{children}</WalletProvider>
    </SuiClientProvider>
  );
}

export default Providers;
