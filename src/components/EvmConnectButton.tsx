import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export default function EvmConnectButton() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({
    address, // Correct property name
  });

  const [balance, setBalance] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (balanceData) {
      // Format the balance to 4 decimal places
      setBalance(parseFloat(balanceData.formatted).toFixed(4));
    }
  }, [balanceData]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      {!isConnected && <button className='font-bold' onClick={() => open()}>Connect Wallet</button>}
      {isConnected && address && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div onClick={() => disconnect()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
          <p>{balance ? `${balance} ETH` : 'Loading...'}</p>
            <p>{truncateAddress(address)}</p>
            
          </div>
        </div>
      )}
    </>
  );
}
