import { useState, useEffect } from 'react';
import { Plus, Trash2, Printer, Settings, MonitorPlay, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generatePDFReceipt } from '../utils/pdfReceipt';
import { generateInvoiceNumber } from '../utils/invoice';

/**
 * ReceiptPreview Component
 * A premium, interactive UI for previewing and editing receipts.
 * Integrates project-specific logic (Addons, Tax) with the user's provided UI.
 */
export default function ReceiptPreview() {
  const navigate = useNavigate();
  const [restaurantName, setRestaurantName] = useState("MYTEDDY RESTAURANT");
  const [address, setAddress] = useState("123, Galle Road, Colombo");
  const [phone, setPhone] = useState("+94 11 234 5678");
  const [invoiceNo, setInvoiceNo] = useState(generateInvoiceNumber());
  const [date, setDate] = useState(new Date().toLocaleString());
  
  const [items, setItems] = useState([
    { 
        id: 1, 
        name: "Colombo Special Burger", 
        qty: 1, 
        price: 1800,
        selectedAddons: [
            { id: 'a1', name: 'Extra Cheese', price: 150 },
            { id: 'a2', name: 'Bacon', price: 250 }
        ]
    },
    { id: 2, name: "Chef's Signature Tea", qty: 2, price: 650, selectedAddons: [] }
  ]);
  
  const [discountPct, setDiscountPct] = useState(20);
  const [taxRate, setTaxRate] = useState(0); // Added Tax logic
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  
  const [paperSize, setPaperSize] = useState("80mm");

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

  const handleAddItem = () => {
    const newItem = {
      id: Date.now(),
      name: "New Item",
      qty: 1,
      price: 0,
      selectedAddons: []
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Logic for accurate totals (including addons)
  const calculateLineTotal = (item: any) => {
    const addonsTotal = (item.selectedAddons || []).reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
    return (item.price + addonsTotal) * item.qty;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const discountAmt = (subtotal * discountPct) / 100;
  const taxAmt = (subtotal - discountAmt) * (taxRate / 100);
  const total = subtotal - discountAmt + taxAmt;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handlePrint = () => {
    // We can either use window.print() as requested or trigger our High-Performance PDF flow
    // The user requested window.print() logic in this file specifically
    window.print();
  };

  const handleNativePDF = () => {
      // Bonus: Trigger the high-performance PDF generator with the current state
      const orderData = {
          invoiceNumber: invoiceNo,
          date: date,
          items: items,
          subTotal: subtotal,
          discount: discountAmt,
          tax: taxAmt,
          grandTotal: total,
          paymentMethod: paymentMethod
      };
      const settings = {
          restaurantName,
          address,
          phone,
          taxRate
      };
      generatePDFReceipt(orderData, settings);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      <style>
        {`
          @media print {
            @page {
              margin: 0; 
            }
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

      {/* Control Panel (Hidden on Print) */}
      <div className="no-print w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 h-screen overflow-y-auto shadow-lg z-10 p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-800">Receipt Settings</h2>
          </div>
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Printer Settings */}
        <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <MonitorPlay className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-blue-800 uppercase text-sm">Printer Setup</h3>
          </div>
          <div>
            <label className="block text-sm text-blue-700 mb-1 font-medium">Paper Size</label>
            <select 
              value={paperSize} 
              onChange={e => setPaperSize(e.target.value)} 
              className="w-full border-blue-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="80mm">80mm (Standard POS Thermal)</option>
              <option value="58mm">58mm (Small Mini Thermal)</option>
            </select>
            <p className="text-xs text-blue-600 mt-2 leading-tight">
              Font sizes will automatically adjust to fit the selected printer paper.
            </p>
          </div>
          <button 
            onClick={handleNativePDF}
            className="w-full bg-blue-600 text-white rounded-lg py-2 mt-2 text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-semibold"
          >
            <Printer className="w-3 h-3" /> PDF Export (HQ)
          </button>
        </div>

        {/* General Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-600 uppercase text-sm">General Info</h3>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Restaurant Name</label>
            <input type="text" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Phone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Invoice Number</label>
            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Date & Time</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-600 uppercase text-sm">Order Items</h3>
            <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg bg-gray-50 relative group">
                <button onClick={() => handleRemoveItem(item.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
                <input 
                  type="text" value={item.name} 
                  onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                  className="w-full bg-white border rounded p-1.5 text-sm mb-2 font-medium" placeholder="Item Name"
                />
                <div className="flex gap-2">
                  <div className="w-1/4">
                    <label className="text-xs text-gray-500">Qty</label>
                    <input type="number" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded p-1.5 text-sm" />
                  </div>
                  <div className="w-1/4">
                    <label className="text-xs text-gray-500">Price</label>
                    <input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', parseInt(e.target.value) || 0)} className="w-full bg-white border rounded p-1.5 text-sm" />
                  </div>
                  <div className="w-2/4">
                    <label className="text-xs text-gray-500">Addons Total</label>
                    <div className="w-full bg-gray-100 border rounded p-1.5 text-sm text-gray-600 italic">
                        {(item.selectedAddons || []).reduce((s: number, a: any) => s + (Number(a.price) || 0), 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals & Payment */}
        <div className="space-y-4 border-t pt-4 pb-10">
          <h3 className="font-semibold text-gray-600 uppercase text-sm">Payment Details</h3>
          <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Discount (%)</label>
                <input type="number" value={discountPct} onChange={e => setDiscountPct(parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Tax (%)</label>
                <input type="number" value={taxRate} onChange={e => setTaxRate(parseInt(e.target.value) || 0)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="CARD">CARD</option>
              <option value="CASH">CASH</option>
              <option value="ONLINE">ONLINE</option>
            </select>
          </div>
          
          <button 
            onClick={handlePrint}
            className="w-full bg-black text-white rounded-lg py-3 mt-4 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors font-semibold shadow-lg"
          >
            <Printer className="w-5 h-5" /> Print Receipt
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-gray-200 p-8 flex items-start justify-center overflow-y-auto no-print">
        <div 
          id="receipt-preview" 
          className={`print-area bg-white shadow-2xl text-black relative mx-auto
            ${paperSize === '80mm' ? 'w-[320px] text-[15px] p-8 rounded-3xl' : 'w-[240px] text-[12px] p-5 rounded-2xl'}
          `}
          style={{ lineHeight: '1.4' }}
        >
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-[1.5em]">
            <div className="mb-[0.5em] flex items-center justify-center" style={{ width: '5em', height: '5em' }}>
              <svg viewBox="0 0 100 100" className="w-full h-full text-black fill-current">
                <path d="M 15 30 L 15 50 C 15 55 18 58 20 60 L 20 80 L 22 80 L 22 60 C 24 58 27 55 27 50 L 27 30 L 25 30 L 25 45 L 23 45 L 23 30 L 21 30 L 21 45 L 19 45 L 19 30 Z" />
                <path d="M 80 30 C 85 30 85 45 85 55 L 82 60 L 82 80 L 80 80 L 80 60 L 78 55 Z" />
                <path d="M 35 30 C 35 20 40 15 50 15 C 60 15 65 20 65 30 C 70 30 72 35 70 40 L 30 40 C 28 35 30 30 35 30 Z" />
                <rect x="32" y="41" width="36" height="5" rx="2" />
                <circle cx="35" cy="50" r="8" />
                <circle cx="65" cy="50" r="8" />
                <circle cx="50" cy="62" r="18" />
                <circle cx="43" cy="58" r="2.5" fill="white" />
                <circle cx="57" cy="58" r="2.5" fill="white" />
                <ellipse cx="50" cy="66" rx="6" ry="4" fill="white" />
                <circle cx="50" cy="65" r="2" />
                <text x="50" y="85" fontFamily="Great Vibes" fontSize="12" textAnchor="middle" fontWeight="bold">MY</text>
                <text x="50" y="95" fontFamily="serif" fontSize="10" textAnchor="middle">TEDDY</text>
              </svg>
            </div>
            <h1 className="receipt-text-xl font-bold text-center tracking-wide leading-tight mt-[0.2em]">{restaurantName.toUpperCase()}</h1>
            <p className="receipt-text-base text-gray-800 text-center mt-[0.3em]">{address}</p>
            <p className="receipt-text-base text-gray-800 text-center">Tel: {phone}</p>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 receipt-spacing" />

          {/* Invoice Meta */}
          <div className="flex justify-between receipt-text-base mb-[0.3em]">
            <span className="text-gray-700">Invoice:</span>
            <span className="font-medium text-gray-900">{invoiceNo}</span>
          </div>
          <div className="flex justify-between receipt-text-base">
            <span className="text-gray-700">Date:</span>
            <span className="font-medium text-gray-900">{date}</span>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 receipt-spacing" />

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-[0.5em] font-bold receipt-text-base mb-[0.8em]">
            <div className="col-span-5">ITEM</div>
            <div className="col-span-2 text-center">QTY</div>
            <div className="col-span-2 text-right">PRICE</div>
            <div className="col-span-3 text-right">TOTAL</div>
          </div>

          {/* Items List */}
          <div className="space-y-[1em] mb-[1.5em]">
            {items.map((item) => {
              const lineTotal = calculateLineTotal(item);
              return (
                <div key={item.id}>
                    <div className="grid grid-cols-12 gap-[0.5em] receipt-text-base text-gray-900 items-start">
                        <div className="col-span-5 pr-[0.2em] leading-tight font-medium">{item.name}</div>
                        <div className="col-span-2 text-center">{item.qty}</div>
                        <div className="col-span-2 text-right whitespace-nowrap">
                        {formatCurrency(item.price)}
                        </div>
                        <div className="col-span-3 text-right whitespace-nowrap font-bold">
                        {formatCurrency(lineTotal)}
                        </div>
                    </div>
                    {/* Render Addons if any */}
                    {(item.selectedAddons || []).length > 0 && (
                        <div className="space-y-[0.3em] mt-[0.3em]">
                            {item.selectedAddons.map((addon: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-[0.5em] receipt-text-xs text-gray-600 italic">
                                    <div className="col-span-5 pl-[0.5em]">+ {addon.name}</div>
                                    <div className="col-span-2"></div>
                                    <div className="col-span-2 text-right">{formatCurrency(Number(addon.price))}</div>
                                    <div className="col-span-3"></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
              );
            })}
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 receipt-spacing" />

          {/* Totals Section */}
          <div className="space-y-[0.4em] px-[0.2em]">
            <div className="flex justify-between items-center receipt-text-base">
                <span className="text-gray-700">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
            </div>

            {discountPct > 0 && (
                <div className="flex justify-between items-center bg-gray-100 py-[0.4em] px-[0.5em] receipt-text-base rounded-sm italic">
                    <span>Discount ({discountPct}%)</span>
                    <span>-{formatCurrency(discountAmt)}</span>
                </div>
            )}

            {taxRate > 0 && (
                <div className="flex justify-between items-center receipt-text-base">
                    <span className="text-gray-700">Tax ({taxRate}%)</span>
                    <span>{formatCurrency(taxAmt)}</span>
                </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center bg-gray-200 py-[0.6em] px-[0.5em] mt-[1em] rounded-sm shadow-sm border-y border-gray-300">
            <span className="font-bold receipt-text-xl uppercase tracking-tighter">Total</span>
            <span className="font-bold receipt-text-2xl tracking-tighter">
                <span className="receipt-text-sm mr-[0.2em] font-normal">Rs.</span>
                {formatCurrency(total)}
            </span>
          </div>

          {/* Footer Area */}
          <div className="mt-[2.5em] text-center flex flex-col items-center">
            <div className="bg-black text-white px-[1.5em] py-[0.5em] rounded-full mb-[1em]">
                 <p className="font-bold receipt-text-base tracking-widest whitespace-nowrap uppercase">PAID VIA {paymentMethod.toUpperCase()}</p>
            </div>
            <p className="signature-font mb-[0.2em] transform -rotate-1 text-gray-800" style={{ fontSize: '3em', lineHeight: '1' }}>Thank You!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
