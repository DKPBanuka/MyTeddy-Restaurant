import { useEffect } from 'react';

interface ModernReceiptUIProps {
  orderData?: any;
  settings?: any;
  logoUrl?: string;
  paperSize?: string;
}

export default function ModernReceiptUI({ 
  orderData, 
  settings, 
  logoUrl,
  paperSize = "80mm" 
}: ModernReceiptUIProps) {

  // Load custom font for the "Thank You!" signature
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Map application data to UI variables safely
  const restaurantName = settings?.restaurantName || "MYTEDDY RESTAURANT";
  const address = settings?.address || "123, Galle Road, Colombo";
  const phone = settings?.phone || "+94 11 234 5678";
  
  const invoiceNo = orderData?.invoiceNumber || "INV-000000000000-0000";
  const dateStr = orderData?.date ? new Date(orderData.date).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Colombo'
  }) : new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });

  const items = orderData?.items || orderData?.orderItems || [];
  const subtotal = Number(orderData?.subTotal || orderData?.subtotal || 0);
  const discountAmt = Number(orderData?.discount || 0);
  const discountPct = orderData?.discountPercentage || (subtotal > 0 ? Math.round((discountAmt / subtotal) * 100) : 0);
  const total = Number(orderData?.grandTotal || 0);
  const paymentMethod = orderData?.paymentMethod || "CASH";

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="font-sans">
      <style>
        {`
          @media print {
            @page { margin: 0; }
            body { 
              background: white; 
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: flex-start;
              align-items: flex-start;
            }
            .no-print { display: none !important; }
            .print-area { 
              box-shadow: none !important; 
              margin: 0 !important; 
              border-radius: 0 !important;
              width: ${paperSize === '80mm' ? '72mm' : '48mm'} !important;
              padding: 0.5em !important;
            }
          }
          .signature-font { font-family: 'Great Vibes', cursive; }
          .receipt-text-base { font-size: 1em; }
          .receipt-text-sm { font-size: 0.85em; }
          .receipt-text-xs { font-size: 0.7em; }
          .receipt-text-lg { font-size: 1.2em; }
          .receipt-text-xl { font-size: 1.5em; }
          .receipt-text-2xl { font-size: 1.8em; }
          .receipt-spacing { margin-top: 1.5em; margin-bottom: 1.5em; }
        `}
      </style>

      {/* The Actual Receipt */}
      <div 
        id="receipt-preview" 
        className={`print-area relative mx-auto
          ${paperSize === '80mm' ? 'w-[320px] text-[15px] p-8 rounded-3xl' : 'w-[240px] text-[12px] p-5 rounded-2xl'}
        `}
        style={{ 
          lineHeight: '1.4', 
          backgroundColor: '#ffffff', 
          color: '#000000',
          boxShadow: 'none' 
        }}
      >
        
        {/* Logo Area */}
        <div className="flex flex-col items-center mb-[1.5em]">
          {logoUrl && (
            <div className="mb-[0.2em] flex items-center justify-center" style={{ width: '7.5em', height: '7.5em' }}>
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <h1 className="receipt-text-xl font-bold text-center tracking-wide leading-tight mt-[0.2em]" style={{ color: '#000000' }}>{restaurantName.toUpperCase()}</h1>
          <p className="receipt-text-base text-center mt-[0.3em]" style={{ color: '#1f2937' }}>{address}</p>
          <p className="receipt-text-base text-center" style={{ color: '#1f2937' }}>Tel: {phone}</p>
        </div>

        <hr className="border-t-[1.5px] border-dashed receipt-spacing" style={{ borderColor: '#9ca3af' }} />

        {/* Invoice Meta */}
        <div className="flex justify-between receipt-text-base mb-[0.3em]">
          <span style={{ color: '#4b5563' }}>Invoice:</span>
          <span className="font-medium" style={{ color: '#111827' }}>{invoiceNo}</span>
        </div>
        <div className="flex justify-between receipt-text-base">
          <span style={{ color: '#4b5563' }}>Date:</span>
          <span className="font-medium" style={{ color: '#111827' }}>{dateStr}</span>
        </div>

        <hr className="border-t-[1.5px] border-dashed receipt-spacing" style={{ borderColor: '#9ca3af' }} />

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-[0.5em] font-bold receipt-text-base mb-[0.8em]">
          <div className="col-span-5">ITEM</div>
          <div className="col-span-2 text-center">QTY</div>
          <div className="col-span-2 text-right">PRICE</div>
          <div className="col-span-3 text-right">TOTAL</div>
        </div>

        {/* Items List */}
        <div className="space-y-[0.8em] mb-[1.5em]">
          {items.map((item: any, index: number) => {
            const name = item.productName || item.product?.name || item.name || 'Item';
            const qty = item.quantity || item.qty || 1;
            
            // Resilient price extraction matching htmlReceipt.ts
            let unitPrice = 0;
            const potentialPrices = [
                item.price,
                item.unitPrice,
                item.priceAtTimeOfSale,
                item.product?.price,
                item.package?.price
            ];
            
            for (const p of potentialPrices) {
                const val = Number(p);
                if (!isNaN(val) && val > 0) {
                    unitPrice = val;
                    break;
                }
            }

            if (unitPrice === 0) {
                const totalVal = Number(item.total || item.totalPrice || item.itemTotal || 0);
                if (totalVal > 0) unitPrice = totalVal / qty;
            }

            const itemTotal = Number(item.total || item.itemTotal || (unitPrice * qty));

            return (
              <div key={index} className="grid grid-cols-12 gap-[0.5em] receipt-text-base items-start" style={{ color: '#111827' }}>
                <div className="col-span-5 pr-[0.2em] leading-tight font-bold">{name}</div>
                <div className="col-span-2 text-center font-bold">{qty}</div>
                <div className="col-span-2 text-right whitespace-nowrap">{formatCurrency(unitPrice)}</div>
                <div className="col-span-3 text-right whitespace-nowrap font-black">{formatCurrency(itemTotal)}</div>
              </div>
            );
          })}
        </div>

        <hr className="border-t-[1.5px] border-dashed receipt-spacing" style={{ borderColor: '#9ca3af' }} />

        {/* Subtotal */}
        {(discountAmt > 0 || subtotal !== total) && (
          <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
            <span>Subtotal</span>
            <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(subtotal)}</span>
          </div>
        )}

        {/* Discount */}
        {discountAmt > 0 && (
          <div className="flex justify-between items-center py-[0.4em] px-[0.5em] receipt-text-lg mb-[0.4em] rounded-sm" style={{ backgroundColor: '#e5e7eb' }}>
            <span>Discount ({discountPct}%)</span>
            <span>-<span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(discountAmt)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center py-[0.5em] px-[0.5em] mt-[0.8em] rounded-sm" style={{ backgroundColor: '#e5e7eb' }}>
          <span className="font-bold receipt-text-xl">Total</span>
          <span className="font-bold receipt-text-2xl tracking-tight"><span className="receipt-text-sm mr-[0.2em] font-normal">Rs.</span>{formatCurrency(total)}</span>
        </div>

        {/* Footer Area */}
        <div className="mt-[2.5em] pb-[2em] text-center flex flex-col items-center">
          <p className="font-bold receipt-text-lg mb-[0.5em]">PAID VIA {paymentMethod.replace('PAID VIA ', '').toUpperCase()}</p>
          <p className="signature-font mb-[0.5em] transform -rotate-2" style={{ fontSize: '2.8em', lineHeight: '1' }}>Thank You!</p>
        </div>

      </div>
    </div>
  );
}
