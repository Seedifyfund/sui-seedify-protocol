import { createContext, useContext, useState, ReactNode } from 'react';

interface NetworkContextType {
  network: 'testnet' | 'mainnet';
  setNetwork: (network: 'testnet' | 'mainnet') => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('mainnet');

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
