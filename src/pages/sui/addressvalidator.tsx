import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import AddressValidatorModal from "../../components/custom/AddressValidatorModal";
import Sidebar2 from "../../components/sidebar";
import { Layout, LayoutHeader } from '@/components/custom/layout';
import { UserNav } from "@/components/user-nav";

// Utility function to validate Sui addresses
const validateAddress = (address: string): boolean => {
    const trimmedAddress = address.trim();
    const regex = /^0x[a-fA-F0-9]{64}$/; // regex for Sui addresses
    return regex.test(trimmedAddress);
};

// Utility function to download addresses as CSV
const downloadCSV = (filename: string, addresses: string[]) => {
    const csvContent = "data:text/csv;charset=utf-8," + addresses.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const AddressValidator: React.FC = () => {
    const [addresses, setAddresses] = useState<string[]>([]);
    const [validAddresses, setValidAddresses] = useState<string[]>([]);
    const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isCollapsed, setIsCollapsed] = useState(false); // State for sidebar collapse
    const handleAddressChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setAddresses(event.target.value.split("\n").map(addr => addr.trim()));
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const csvRows = text.split("\n").map(row => row.trim());
                setAddresses(csvRows);
            };
            reader.readAsText(file);
        }
    };

    const validateAddresses = () => {
        const valid = addresses.filter(validateAddress);
        const invalid = addresses.filter(address => !validateAddress(address));
        setValidAddresses(valid);
        setInvalidAddresses(invalid);
        if (invalid.length > 0) {
            setIsModalOpen(true);
        }
    };

    return (<><Layout><LayoutHeader>
		<div className='ml-auto flex items-center space-x-4'>
			<UserNav />
		</div>
	</LayoutHeader>
            <div className='flex'></div>
				<Sidebar2
					isCollapsed={isCollapsed}
					setIsCollapsed={setIsCollapsed}
				/>
        <div className="container mx-auto p-4  sm:mt-40 mt-10 sm:px-12 px-4">
            <h2 className="text-2xl font-semibold mb-4 text-center">
                Sui Address Checker
            </h2>
            <div className="mb-4">
                <label className="block mb-2">
                    Input Addresses (one per line)
                </label>
                <textarea
                    onChange={handleAddressChange}
                    className="w-full p-2 border rounded bg-slate-900"
                    rows={10}
                    placeholder="0x1234...&#10;0x5678..."
                ></textarea>
            </div>
            <div className="mb-4">
                <label className="block mb-2">
                    Or Upload CSV File (One Address in each Row)
                </label>
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full p-2 border rounded"
                />
            </div>
            <Button
                onClick={validateAddresses}
                className="w-full bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-400"
            >
                Validate Addresses
            </Button>
            <div className="mt-4 flex justify-between">
                <Button
                    onClick={() => downloadCSV("ValidAddresses.csv", validAddresses)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Download Valid Addresses
                </Button>
                <Button
                    onClick={() => downloadCSV("InvalidAddresses.csv", invalidAddresses)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    Download Invalid Addresses
                </Button>
            </div>
            <AddressValidatorModal 
                open={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                invalidAddresses={invalidAddresses} 
                validAddresses={validAddresses} 
            />
        </div></Layout></>
    );
};

export default AddressValidator;