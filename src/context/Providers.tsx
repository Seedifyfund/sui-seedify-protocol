"use client";

import { ReactNode, useEffect, useState, createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui.js/client';
import { Buffer } from 'buffer';

interface NetworkContextProps {
  selectedNetwork: "testnet" | "mainnet";
  changeNetwork: (network: "testnet" | "mainnet") => void;
}

const NetworkContext = createContext<NetworkContextProps | undefined>(undefined);



const networkConfig = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  const [selectedNetwork, setSelectedNetwork] = useState<"testnet" | "mainnet">("testnet");

  useEffect(() => {
    (window as any).Buffer = Buffer;

  }, []);

  const changeNetwork = (network: "testnet" | "mainnet") => {
    setSelectedNetwork(network);
  };

  return ( <NetworkContext.Provider value={{ selectedNetwork, changeNetwork }}>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={selectedNetwork}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider></NetworkContext.Provider>
  );
};

export default Providers;
export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};