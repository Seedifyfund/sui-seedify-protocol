// utils/routeProtection.js
export const routeProtection = async (currentAccount:any) => {
   const adminWallets = [
  process.env.NEXT_PUBLIC_ADMIN_WALLET_1,
  process.env.NEXT_PUBLIC_ADMIN_WALLET_2,
];

  console.log(adminWallets);

  const isAdmin =
    currentAccount !== null &&
    adminWallets.includes(currentAccount.address.toString());

  if (!isAdmin) {
    // If the user's wallet is not in the admin wallets list,
    // redirect them to the root page
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
      isRedirect: true,
    };
  }

  // If the user's wallet is in the admin wallets list, allow access
  return {
    redirect: null,
    isRedirect: false,
  };
};