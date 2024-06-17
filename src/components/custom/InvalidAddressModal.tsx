import React from 'react';

interface InvalidAddressModalProps {
    open: boolean;
    onClose: () => void;
    invalidAddresses: string[];
}

const InvalidAddressModal: React.FC<InvalidAddressModalProps> = ({ open, onClose, invalidAddresses }) => {
    if (!open) return null;

    const downloadCSV = () => {
        const csvContent = "data:text/csv;charset=utf-8," + invalidAddresses.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "invalid_addresses.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
            <div className="bg-white rounded-lg p-8 z-50 w-full max-w-2xl mx-4">
                <h2 className="text-xl font-bold mb-4 text-black">Invalid Addresses found, Skipping from Transactions...</h2>
                <div className="max-h-64 overflow-y-auto mb-4">
                    <ul className="list-disc pl-5 text-black">
                        {invalidAddresses.map((address, index) => (
                            <li key={index}>{address}</li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-between">
                    <button 
                        onClick={onClose} 
                        className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-700"
                    >
                        Close
                    </button>
                    <button 
                        onClick={downloadCSV} 
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400"
                    >
                        Download CSV
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvalidAddressModal;
