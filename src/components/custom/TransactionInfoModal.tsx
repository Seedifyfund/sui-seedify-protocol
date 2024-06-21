// TransactionInfoModal.tsx
import React from 'react';

interface TransactionInfoModalProps {
    open: boolean;
    onClose: () => void;
    batchInfo: { batchCount: number; lastBatchSize: number } | null;
    onConfirm: () => void;
    batchSize: number; // Add batchSize prop
}




const TransactionInfoModal: React.FC<TransactionInfoModalProps> = ({ open, onClose, batchInfo, onConfirm, batchSize }) => {

    
    if (!open) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
            <div className="bg-white rounded-lg p-8 z-50 w-full max-w-2xl mx-4">
                <h2 className="text-xl font-bold mb-4 text-black">Transaction Information</h2>
                {batchInfo && (
                    <div className="text-black">
                        <p>You will go through {batchInfo.batchCount} transactions of {batchSize} recipients each, and the last transaction will have {batchInfo.lastBatchSize} recipients.</p>
                    </div>
                )}
                <div className="flex justify-between mt-4">
                    <button 
                        onClick={onClose} 
                        className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-400"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionInfoModal;
