import styled from 'styled-components';
import { ConnectButton, useConnectWallet, useWallets } from '@mysten/dapp-kit';

const Container = styled.div`
  padding: 20px;
`;

const WalletList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const WalletButton = styled.button`
  background-color: black;
  color: black;
  padding: 10px 20px;
  margin: 10px 0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.5);
  }
`;

function SuiWallet() {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();

  return (
    <Container>
      <ConnectButton />
      <WalletList>
        {wallets.map((wallet) => (
          <li key={wallet.name}>
            <WalletButton
              onClick={() => {
                connect(
                  { wallet },
                  {
                    onSuccess: () => console.log('connected'),
                  },
                );
              }}
            >
              Connect to {wallet.name}
            </WalletButton>
          </li>
        ))}
      </WalletList>
    </Container>
  );
}

export default SuiWallet;
