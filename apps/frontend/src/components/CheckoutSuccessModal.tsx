import React from 'react';
import { CheckCircle2, Printer, XCircle, ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import ModernReceiptUI from './ModernReceiptUI';
import { generatePDFReceipt } from '../utils/pdfReceipt';

interface CheckoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: any;
}

export const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  isOpen,
  onClose,
  orderData
}) => {
  const { settings } = useSettings();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Banner Section */}
        <div className="bg-slate-900 p-8 flex flex-col items-center text-white relative">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-900/20 animate-bounce">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Payment Successful!</h2>
          <p className="text-slate-400 text-sm font-medium mt-1">Transaction completed and order recorded.</p>
          
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <div className="w-24 h-24 border-8 border-white rounded-full -mr-12 -mt-12" />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8">
          <div className="max-h-[50vh] overflow-y-auto bg-slate-50/50 rounded-2xl mb-6 flex justify-center p-4">
            <ModernReceiptUI 
              orderData={orderData} 
              settings={settings} 
              logoUrl={settings?.logoUrl}
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => generatePDFReceipt(orderData, settings, settings?.logoUrl)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              <Printer size={20} />
              DOWNLOAD PDF RECEIPT
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-500 font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              DONE
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Close Icon for convenience */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <XCircle size={24} />
        </button>
      </div>
    </div>
  );
};
