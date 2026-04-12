import React, { useState } from 'react';
import { Lock as LockIcon, Loader2, X } from 'lucide-react';

interface VoidPINModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => Promise<void>;
    title?: string;
    description?: string;
    isProcessing?: boolean;
}

export const VoidPINModal: React.FC<VoidPINModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Authorization Required",
    description = "Please enter a valid Manager PIN to authorize this action.",
    isProcessing = false
}) => {
    const [pin, setPin] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (pin.length >= 4) {
            onConfirm(pin);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.2)] p-10 text-center animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-amber-50/50">
                    <LockIcon size={36} />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">{title}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">
                    {description}
                </p>
                
                <div className="space-y-6">
                    <input
                        type="password"
                        maxLength={6}
                        placeholder="••••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        className="w-full text-center px-6 py-5 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl outline-none font-black text-2xl tracking-[0.5em] transition-all"
                        autoFocus
                    />
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={pin.length < 4 || isProcessing}
                            className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isProcessing && <Loader2 size={14} className="animate-spin" />}
                            {isProcessing ? "Verifying..." : "Authorize"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoidPINModal;
