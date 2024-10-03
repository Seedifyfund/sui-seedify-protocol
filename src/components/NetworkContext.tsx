import { createContext, useContext, useState, ReactNode } from "react";

interface NetworkContextType {
  network: "testnet" | "mainnet";
  setNetwork: (network: "testnet" | "mainnet") => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("mainnet");

  return (
    <NetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

export function getContractAddress() {
  const { network } = useNetwork();

  if (!network) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }

  const contractAddress =
    network === "mainnet"
      ? import.meta.env.VITE_MAINNET_SEEDIFY_ADDRESS
      : import.meta.env.VITE_TESTNET_SEEDIFY_ADDRESS;

  if (!contractAddress) {
    console.error(
      `Invalid ${network === "mainnet" ? "VITE_MAINNET_SEEDIFY_ADDRESS" : "VITE_TESTNET_SEEDIFY_ADDRESS"} config setting.`
    );
  } else {
    console.log("Reading from: ", contractAddress);
  }

  return contractAddress;
}
