import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { config } from '@/config';
import Web3ModalProvider from '@/context';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { WalletProvider } from "@suiet/wallet-kit";
import Providers from '@/context/Providers'; // Assuming the context provider is in this path

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(config, headers().get('cookie'));

  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  if (!projectId) {
    throw new Error('Project ID is not defined');
  }

  return (
    <html lang="en">
      <body>
        <Web3ModalProvider initialState={initialState}>
          <Providers>
            <WalletProvider>
              <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                {children}
                <Toaster />
              </ThemeProvider>
            </WalletProvider>
          </Providers>
        </Web3ModalProvider>
      </body>
    </html>
  );
}
