import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import { WalletProvider } from "@mysten/dapp-kit";
import router from '@/router'
import '@/index.css'
import Providers from './context/Providers'
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';






ReactDOM.createRoot(document.getElementById('root')!).render(
  <Providers ><React.StrictMode>
     <WalletProvider
     
     >
     <ToastContainer />
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider></WalletProvider>
  </React.StrictMode></Providers>
)