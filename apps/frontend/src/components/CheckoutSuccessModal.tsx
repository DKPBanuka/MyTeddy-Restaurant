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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
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
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1 w-full max-h-[82vh] overflow-y-auto overflow-x-hidden bg-slate-50 border-2 border-slate-100 rounded-[2rem] flex justify-center p-4 sm:p-6 custom-scrollbar group">
            <div className="min-w-[320px] transition-transform duration-300">
              <ModernReceiptUI 
                orderData={orderData} 
                settings={settings} 
                logoUrl={settings?.logoUrl}
              />
            </div>
          </div>

          <div className="w-full md:w-72 flex flex-col gap-4 shrink-0">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mb-2">
              <div className="text-emerald-800 font-bold text-sm mb-1 uppercase tracking-wider text-center">Order Recorded</div>
              <div className="text-emerald-600 text-[10px] font-semibold text-center leading-tight">Your database is updated and items are ready for fulfillment.</div>
            </div>

            <button
              onClick={() => {
                generatePDFReceipt(orderData, settings, settings?.logoUrl);
                setTimeout(onClose, 1000); // Close after starting download
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
            >
              <Printer size={22} />
              PRINT RECEIPT
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-500 font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              DONE
              <ArrowRight size={22} />
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
