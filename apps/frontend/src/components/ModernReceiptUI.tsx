import { useEffect } from 'react';

interface ModernReceiptUIProps {
  orderData?: any;
  settings?: any;
  logoUrl?: string;
  paperSize?: string;
  receiptType?: 'NORMAL' | 'PARTY_ADVANCE' | 'PARTY_FINAL';
}

export default function ModernReceiptUI({
  orderData,
  settings,
  logoUrl,
  paperSize = "80mm",
  receiptType = 'NORMAL'
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

  const isParty = receiptType === 'PARTY_ADVANCE' || receiptType === 'PARTY_FINAL';

  const invoiceNo = isParty
    ? `PB-${(orderData?.id || '0000').slice(-6).toUpperCase()}`
    : (orderData?.invoiceNumber || "INV-0000");

  const actualDate = isParty ? orderData?.eventDate : (orderData?.date || new Date());
  const dateStr = actualDate ? new Date(actualDate).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    timeZone: 'Asia/Colombo'
  }) : new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });

  // Items Parsing
  let displayItems: any[] = [];
  let baseItems: any[] = [];
  let grandAddonsTotal = 0;

  if (isParty) {
    const rawItems = orderData?.items;
    baseItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);

    const mappedItems = baseItems.map((item: any) => {
      let itemPrice = 0;
      if (item.packageId) {
        itemPrice = parseFloat(item.package?.price || '0');
      } else if (item.productId) {
        itemPrice = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
        if (item.selectedAddons) {
          itemPrice += item.selectedAddons.reduce((sum: number, a: any) => sum + parseFloat(a.price), 0);
        }
      } else if (item.addonIds && item.selectedAddons) {
        itemPrice = parseFloat(item.selectedAddons[0]?.price || '0');
      }

      const rawName = item.package?.name || item.product?.name || item.name || 'Item';
      const sizeName = typeof item.size === 'string' ? item.size : (item.size?.name || item.sizeName || null);

      // Truncate name if it's too long to allow space for the size
      const maxChars = 45;
      const displayNameRaw = rawName.replace(/\(RETAIL\)/gi, '').trim();
      const displayName = displayNameRaw.length > maxChars ? displayNameRaw.substring(0, maxChars - 3) + '...' : displayNameRaw;

      const addons = (item.selectedAddons || []).map((a: any) => a.name);

      return {
        name: displayName,
        size: sizeName,
        addons: addons,
        qty: item.quantity || 1,
        price: itemPrice,
        total: itemPrice * (item.quantity || 1)
      };
    });
    displayItems = [...displayItems, ...mappedItems];

    // Add Hall Charge if applicable
    const hallCharge = Number(orderData?.hallCharge || 0);
    if (hallCharge > 0) {
      displayItems.push({
        name: 'Hall Charge (Exclusive)',
        qty: 1,
        price: hallCharge,
        total: hallCharge
      });
    }

    // Note: Additional Extras moved to summary section as requested
  } else {
    // NORMAL RECEIPT PATH
    const rawItems = orderData?.items || orderData?.orderItems || [];
    baseItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);

    const mappedItems = baseItems.map((item: any) => {
      const name = item.productName || item.product?.name || item.name || 'Item';
      const qty = item.quantity || item.qty || 1;

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

      const maxChars = 45;
      const displayNameRaw = name.replace(/\(RETAIL\)/gi, '').trim();
      const displayName = displayNameRaw.length > maxChars ? displayNameRaw.substring(0, maxChars - 3) + '...' : displayNameRaw;

      // Robust size detection
      const sizeName = item.sizeName ||
        item.productSize?.name ||
        (typeof item.size === 'string' ? item.size : item.size?.name) ||
        item.variantName ||
        null;

      // Addons detection
      const addons = (item.addons || item.selectedAddons || item.orderItemAddons || []).map((a: any) =>
        a.addonName || a.addon?.name || a.name || (typeof a === 'string' ? a : 'Addon')
      );

      const itemTotal = Number(item.total || item.itemTotal || (unitPrice * qty));
      return {
        name: displayName,
        size: sizeName,
        addons,
        qty: qty,
        price: unitPrice,
        total: itemTotal
      };
    });

    displayItems = [...displayItems, ...mappedItems];

    // Consolidate Addons for Normal Receipts
    baseItems.forEach((item: any) => {
      const itemAddons = (item.addons || item.selectedAddons || item.orderItemAddons || []);
      const itemAddonTotal = itemAddons.reduce((sum: number, a: any) => {
        const p = Number(a.price || a.addonPrice || a.unitPrice || 0);
        return sum + p;
      }, 0);
      const qty = item.quantity || item.qty || 1;
      grandAddonsTotal += (itemAddonTotal * qty);
    });

    if (grandAddonsTotal > 0) {
      displayItems.push({
        name: 'Addition items',
        qty: 1,
        price: grandAddonsTotal,
        total: grandAddonsTotal,
        isAddonRow: true
      });
    }
  }

  const subtotal = isParty
    ? (Number(orderData?.hallCharge || 0) + Number(orderData?.menuTotal || 0))
    : Number(orderData?.subTotal || orderData?.subtotal || 0);

  const addonsTotal = isParty ? Number(orderData?.addonsTotal || 0) : 0;

  const discountAmt = Number(orderData?.discount || 0);
  const serviceChargeAmt = Number(orderData?.serviceCharge || 0);
  const discountPct = isParty ? 0 : (orderData?.discountPercentage || (subtotal > 0 ? Math.round((discountAmt / subtotal) * 100) : 0));
  const total = isParty ? Number(orderData?.totalAmount || 0) : Number(orderData?.grandTotal || 0);
  const advancePaid = Number(orderData?.advancePaid || 0);

  const paymentMethod = orderData?.paymentMethod || "CASH";

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getReceiptHeader = () => {
    if (receiptType === 'PARTY_ADVANCE') return 'BOOKING CONFIRMATION - ADVANCE RECEIPT';
    if (receiptType === 'PARTY_FINAL') return 'FINAL INVOICE - PARTY BOOKING';
    return null;
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
            .line-clamp-2 {
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;  
              overflow: hidden;
              text-overflow: ellipsis;
            }
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

        {getReceiptHeader() ? (
          <div className="bg-black text-white py-1 px-2 text-center receipt-text-sm font-black mb-[1em] tracking-tighter">
            {getReceiptHeader()}
          </div>
        ) : (
          orderData?.isSplitReceipt && (
            <div className="bg-slate-900 text-white py-1 px-2 text-center receipt-text-xs font-black mb-[1em] tracking-tighter uppercase italic">
              Split Payment Receipt
            </div>
          )
        )}

        <hr className="border-t-[1.5px] border-dashed receipt-spacing" style={{ borderColor: '#9ca3af' }} />

        {/* Invoice Meta */}
        <div className="flex justify-between receipt-text-base mb-[0.3em]">
          <span style={{ color: '#4b5563' }}>Invoice:</span>
          <span className="font-medium" style={{ color: '#111827' }}>{invoiceNo}</span>
        </div>
        <div className="flex justify-between receipt-text-base">
          <span style={{ color: '#4b5563' }}>{isParty ? 'Event Date:' : 'Date:'}</span>
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
          {displayItems.map((item: any, index: number) => {
            return (
              <div key={index} className="grid grid-cols-12 gap-[0.5em] receipt-text-base items-start" style={{ color: '#111827' }}>
                <div className="col-span-5 pr-[0.2em] leading-tight flex flex-col items-start overflow-hidden">
                  <div className="font-bold w-full">
                    {item.name}
                    {item.size && (
                      <div className="receipt-text-sm font-[1000] text-slate-950 mt-1">
                        ({item.size})
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center font-bold">{item.qty}</div>
                <div className="col-span-2 text-right whitespace-nowrap">{formatCurrency(item.price)}</div>
                <div className="col-span-3 text-right whitespace-nowrap font-black">{formatCurrency(item.total)}</div>
              </div>
            );
          })}
        </div>

        <hr className="border-t-[1.5px] border-dashed receipt-spacing" style={{ borderColor: '#9ca3af' }} />

        {/* Financials Section */}
        {receiptType === 'NORMAL' ? (
          <>
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
          </>
        ) : receiptType === 'PARTY_ADVANCE' ? (
          <>
            <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
              <span>Base Total</span>
              <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(subtotal)}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em] font-bold">
                <span>Additional Extras</span>
                <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(addonsTotal)}</span>
              </div>
            )}
            {serviceChargeAmt > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
                <span>Service Charge</span>
                <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(serviceChargeAmt)}</span>
              </div>
            )}
            {discountAmt > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
                <span>Discount Applied</span>
                <span>-<span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em] font-bold">
              <span>Advance Paid</span>
              <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(advancePaid)}</span>
            </div>
            <div className="flex justify-between items-center py-[0.5em] px-[0.5em] mt-[0.8em] rounded-sm bg-black text-white">
              <span className="font-bold receipt-text-xl">BALANCE DUE</span>
              <span className="font-bold receipt-text-2xl tracking-tight"><span className="receipt-text-sm mr-[0.2em] font-normal">Rs.</span>{formatCurrency(total - advancePaid)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
              <span>Base Total</span>
              <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(subtotal)}</span>
            </div>
            {addonsTotal > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em] font-bold">
                <span>Additional Extras</span>
                <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(addonsTotal)}</span>
              </div>
            )}
            {serviceChargeAmt > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
                <span>Service Charge</span>
                <span><span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(serviceChargeAmt)}</span>
              </div>
            )}
            {discountAmt > 0 && (
              <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em]">
                <span>Discount Applied</span>
                <span>-<span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between items-center receipt-text-lg mb-[0.4em] px-[0.2em] italic">
              <span>Less: Advance Paid</span>
              <span>-<span className="receipt-text-sm mr-[0.2em]">Rs.</span>{formatCurrency(advancePaid)}</span>
            </div>
            <div className="flex justify-between items-center py-[0.5em] px-[0.5em] mt-[0.8em] rounded-sm bg-black text-white">
              <span className="font-bold receipt-text-lg leading-tight">NET AMOUNT<br />PAYABLE / PAID</span>
              <span className="font-bold receipt-text-2xl tracking-tight"><span className="receipt-text-sm mr-[0.2em] font-normal">Rs.</span>{formatCurrency(total - advancePaid)}</span>
            </div>
          </>
        )}

        {/* Footer Area */}
        <div className="mt-[2.5em] pb-[2em] text-center flex flex-col items-center">
          {receiptType === 'NORMAL' && <p className="font-bold receipt-text-lg mb-[0.5em]">PAID VIA {paymentMethod.replace('PAID VIA ', '').toUpperCase()}</p>}
          <p className="signature-font mb-[0.5em] transform -rotate-2" style={{ fontSize: '2.8em', lineHeight: '1' }}>Thank You!</p>
          {isParty && <p className="receipt-text-xs uppercase tracking-widest opacity-50 font-bold mt-2">Professional Hospitality by MyTeddy</p>}
        </div>

      </div>
    </div>
  );
}
