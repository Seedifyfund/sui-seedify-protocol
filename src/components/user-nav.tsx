import { useState, Fragment } from 'react';
import { Button } from '@/components/custom/button';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Dialog, Transition } from '@headlessui/react';
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton } from "@mysten/dapp-kit";
import "@suiet/wallet-kit/style.css";
export function UserNav() {
  const [isConnected] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);


  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        {isConnected ? "Sui Mainnet" : "Select Network"}
      </Button>

      <Transition show={dialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setDialogOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg py-10 bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                  <button
                    type="button"
                    className="absolute top-0 right-0 m-4 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setDialogOpen(false)}
                  >
                    <Cross2Icon className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 text-center">
                    <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                      Connect to Preferred Network
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Select the network you want to connect to.
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-center">
                    <ConnectButton />
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
