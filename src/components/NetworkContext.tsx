import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from "react";

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

  const contractAddress = useMemo(
    () =>
      network === "mainnet"
        ? import.meta.env.VITE_MAINNET_SEEDIFY_ADDRESS
        : import.meta.env.VITE_TESTNET_SEEDIFY_ADDRESS,
    [network]
  );

  useEffect(() => {
    if (!contractAddress) {
      console.error(
        `Invalid ${network === "mainnet" ? "VITE_MAINNET_SEEDIFY_ADDRESS" : "VITE_TESTNET_SEEDIFY_ADDRESS"} config setting.`
      );
    } else {
      console.log("Contract address: ", contractAddress);
    }
  }, [contractAddress]);

  return contractAddress;
}

export function getAdminCapObjectId() {
  const { network } = useNetwork();

  if (!network) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }

  const adminCapObjectId = useMemo(
    () =>
      network === "mainnet"
        ? import.meta.env.VITE_MAINNET_ADMIN_CAP_OBJECT_ID
        : import.meta.env.VITE_TESTNET_ADMIN_CAP_OBJECT_ID,
    [network]
  );

  useEffect(() => {
    if (!adminCapObjectId) {
      console.error(
        `Invalid ${
          network === "mainnet"
            ? "VITE_MAINNET_ADMIN_CAP_OBJECT_ID"
            : "VITE_TESTNET_ADMIN_CAP_OBJECT_ID"
        } config setting.`
      );
    } else {
      console.log("Admin cap object id: ", adminCapObjectId);
    }
  }, [adminCapObjectId]);

  return adminCapObjectId;
}
