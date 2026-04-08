import React, { useEffect } from 'react';

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  selectedAddons?: any[];
}

interface OrderData {
  invoiceNumber: string;
  date: string;
  orderItems: ReceiptItem[];
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: string;
}

interface ReceiptSettings {
  restaurantName: string;
  address: string;
  phone: string;
}

interface ModernReceiptProps {
  orderData: OrderData | null;
  settings: ReceiptSettings;
  logoUrl?: string | null;
}

const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  return null;
};

export const ModernReceiptWithLogo: React.FC<ModernReceiptProps> = ({ orderData, settings, logoUrl }) => {
  if (!orderData) return <p className="text-center py-4 text-slate-500 font-medium">No order data available.</p>;

  const formatCurrency = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US');
  };

  const paperSize = "80mm"; 

  // Map orderItems to ensure naming consistency if needed
  const items = orderData.orderItems || [];

  return (
    <div 
      id="receipt-preview" 
      className={`bg-white shadow-2xl text-black relative mx-auto font-sans
        ${paperSize === '80mm' ? 'w-full max-w-[320px] text-[15px] p-6 rounded-3xl' : 'w-full max-w-[240px] text-[12px] p-5 rounded-2xl'}
      `}
      style={{ lineHeight: '1.4' }}
    >
      <FontLoader />
      
      <style>{`
        .signature-font { font-family: 'Great Vibes', cursive; }
        .receipt-text-base { font-size: 1em; }
        .receipt-text-sm { font-size: 0.85em; }
        .receipt-text-xs { font-size: 0.7em; }
        .receipt-text-lg { font-size: 1.2em; }
        .receipt-text-xl { font-size: 1.5em; }
        .receipt-text-2xl { font-size: 1.8em; }
        .receipt-spacing { margin-top: 1.5em; margin-bottom: 1.5em; }
      `}</style>

      {/* Header with Dynamic Logo */}
      <div className="flex flex-col items-center mb-[1.5em]">
        <div className="mb-[0.5em] flex items-center justify-center overflow-hidden" style={{ width: '4.5em', height: '4.5em' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Restaurant Logo" className="w-full h-full object-contain" />
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full text-black fill-current opacity-80">
              <path d="M 35 30 C 35 20 40 15 50 15 C 60 15 65 20 65 30 C 70 30 72 35 70 40 L 30 40 C 28 35 30 30 35 30 Z" />
              <text x="50" y="70" fontSize="12" textAnchor="middle" fontWeight="bold">MY TEDDY</text>
            </svg>
          )}
        </div>
        <h1 className="receipt-text-xl font-black text-center tracking-tight leading-tight mt-[0.2em] uppercase">
          {settings.restaurantName}
        </h1>
        <p className="receipt-text-sm text-slate-700 text-center mt-[0.3em] font-medium leading-relaxed">{settings.address}</p>
        <p className="receipt-text-sm text-slate-700 text-center font-bold">Tel: {settings.phone}</p>
      </div>

      <hr className="border-t-[1.5px] border-dashed border-slate-300 receipt-spacing" />

      {/* Invoice Meta */}
      <div className="flex justify-between receipt-text-sm mb-[0.3em]">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Invoice:</span>
        <span className="font-bold text-slate-900">{orderData.invoiceNumber}</span>
      </div>
      <div className="flex justify-between receipt-text-sm">
        <span className="text-slate-500 font-bold uppercase tracking-wider">Date:</span>
        <span className="font-bold text-slate-900">{new Date(orderData.date || Date.now()).toLocaleString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <hr className="border-t-[1.5px] border-dashed border-slate-300 receipt-spacing" />

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-[0.25em] font-black receipt-text-xs mb-[0.8em] text-slate-400 uppercase tracking-wider">
        <div className="col-span-5">ITEM</div>
        <div className="col-span-2 text-center">QTY</div>
        <div className="col-span-2 text-right">PRICE</div>
        <div className="col-span-3 text-right">TOTAL</div>
      </div>

      {/* Items List */}
      <div className="space-y-[1em] mb-[1.5em]">
        {items.map((item, idx) => (
          <div key={`${item.id}-${idx}`} className="flex flex-col">
            <div className="grid grid-cols-12 gap-[0.25em] receipt-text-base text-slate-900 items-start">
              <div className="col-span-5 pr-[0.2em] leading-tight font-bold uppercase">{item.name}</div>
              <div className="col-span-2 text-center font-medium">{item.quantity}</div>
              <div className="col-span-2 text-right whitespace-nowrap text-slate-600">{formatCurrency(item.unitPrice)}</div>
              <div className="col-span-3 text-right whitespace-nowrap font-black">{formatCurrency(item.total || (item.unitPrice * item.quantity))}</div>
            </div>
            {item.selectedAddons && item.selectedAddons.length > 0 && (
              <div className="pl-1 mt-1 space-y-0.5">
                {item.selectedAddons.map((addon: any, aidx: number) => (
                  <div key={aidx} className="text-[10px] text-slate-500 italic font-medium">
                    + {addon.name.toUpperCase()} (Rs.{addon.price})
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <hr className="border-t-[1.5px] border-dashed border-slate-300 receipt-spacing" />

      {/* Totals Section */}
      <div className="space-y-[0.4em]">
        <div className="flex justify-between items-center receipt-text-lg px-[0.2em]">
          <span className="text-slate-600 font-medium">Subtotal</span>
          <span className="font-bold text-slate-900 text-[1.1em]">{formatCurrency(orderData.subTotal)}</span>
        </div>

        {orderData.discount > 0 && (
          <div className="flex justify-between items-center bg-slate-50 py-[0.5em] px-[0.5em] receipt-text-lg rounded-xl border border-slate-100">
            <span className="text-emerald-600 font-bold">Discount</span>
            <span className="font-black text-emerald-600">-{formatCurrency(orderData.discount)}</span>
          </div>
        )}

        {orderData.tax > 0 && (
          <div className="flex justify-between items-center receipt-text-lg px-[0.2em]">
            <span className="text-slate-600 font-medium">Tax</span>
            <span className="font-bold text-slate-900">+{formatCurrency(orderData.tax)}</span>
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between items-center bg-slate-900 text-white py-[0.8em] px-[0.6em] mt-[1em] rounded-2xl shadow-lg shadow-slate-200">
          <span className="font-bold receipt-text-xl uppercase tracking-wider">Total</span>
          <div className="text-right">
            <span className="receipt-text-sm mr-[0.2em] opacity-80 font-medium">Rs.</span>
            <span className="font-black receipt-text-2xl tracking-tighter">{formatCurrency(orderData.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer Area with Signature */}
      <div className="mt-[2.5em] text-center flex flex-col items-center">
        <div className="bg-slate-100 text-slate-800 px-4 py-1.5 rounded-full font-black receipt-text-sm mb-[0.8em] tracking-[0.2em] uppercase">
          {orderData.paymentMethod?.replace('PAID VIA ', '').toUpperCase()}
        </div>
        <p className="signature-font mb-[0.4em] transform -rotate-2 text-slate-800" style={{ fontSize: '3.2em', lineHeight: '1' }}>Thank You!</p>
        <div className="w-full border-t border-slate-200 mt-[0.8em] pt-[0.8em]">
          <p className="receipt-text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Come Again to MyTeddy</p>
        </div>
      </div>
    </div>
  );
};
