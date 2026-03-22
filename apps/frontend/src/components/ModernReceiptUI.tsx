import React from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ModernReceiptUIProps {
  orderData?: {
    invoiceNumber: string;
    date: string;
    items: ReceiptItem[];
    subtotal: number;
    discount: number;
    discountPercentage?: number;
    tax: number;
    grandTotal: number;
    paymentMethod: string;
  };
  settings?: {
    restaurantName: string;
    address: string;
    phone: string;
  };
}

const BearLogo = () => (
  <svg width="120" height="120" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bear Ears */}
    <circle cx="60" cy="50" r="28" fill="black" />
    <circle cx="140" cy="50" r="28" fill="black" />
    <circle cx="60" cy="50" r="15" fill="white" />
    <circle cx="140" cy="50" r="15" fill="white" />
    {/* Bear Head */}
    <circle cx="100" cy="110" r="75" fill="white" stroke="black" strokeWidth="6" />
    {/* Chef Hat */}
    <path d="M75 35C75 15 125 15 125 35V50H75V35Z" fill="white" stroke="black" strokeWidth="5" />
    <path d="M65 50H135V65C135 70 130 73 125 73H75C70 73 65 70 65 65V50Z" fill="white" stroke="black" strokeWidth="5" />
    {/* Eyes */}
    <circle cx="75" cy="115" r="7" fill="black" />
    <circle cx="125" cy="115" r="7" fill="black" />
    {/* Muzzle */}
    <ellipse cx="100" cy="145" rx="28" ry="22" fill="#f3f4f6" stroke="black" strokeWidth="3" />
    <path d="M90 138C90 138 100 130 110 138" stroke="black" strokeWidth="3" strokeLinecap="round" />
    <circle cx="100" cy="145" r="10" fill="black" />
    <path d="M100 155V162M100 162C95 162 90 159 90 159M100 162C105 162 110 159 110 159" stroke="black" strokeWidth="3" strokeLinecap="round" />
    {/* Utensils */}
    <path d="M35 100V150M25 100H45" stroke="black" strokeWidth="4" strokeLinecap="round" />
    <path d="M165 100V150M155 100C155 100 155 115 175 115" stroke="black" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const ModernReceiptUI: React.FC<ModernReceiptUIProps> = ({ 
  orderData, 
  settings 
}) => {
  const data = orderData || {
    invoiceNumber: "INV-1774161667070-6460",
    date: "22/03/2026, 12:14:51 pm",
    items: [
      { name: "Colombo Special Burger", quantity: 1, unitPrice: 1800, total: 1800 },
      { name: "Chef's Signature Tea", quantity: 2, unitPrice: 650, total: 1300 }
    ],
    subtotal: 3100,
    discount: 620,
    discountPercentage: 20,
    grandTotal: 2480,
    paymentMethod: "PAID VIA CARD"
  };

  const restaurant = settings || {
    restaurantName: "MYTEDDY RESTAURANT",
    address: "123, Galle Road, Colombo",
    phone: "+94 11 234 5678"
  };

  return (
    <div className="flex items-center justify-center p-12 bg-gray-100 min-h-screen font-sans">
      <div className="w-[480px] bg-white p-12 text-black shadow-2xl rounded-[60px] relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-2 scale-150">
            <BearLogo />
          </div>
          <div className="text-center font-black text-sm uppercase tracking-[0.4em] mt-2 mb-4 border-b-2 border-black pb-1">
            MY TEDDY
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight text-center leading-tight">
            {restaurant.restaurantName}
          </h1>
          <div className="flex flex-col items-center mt-4 space-y-1">
            <span className="text-2xl font-medium text-center">{restaurant.address}</span>
            <span className="text-2xl font-medium">Tel: {restaurant.phone}</span>
          </div>
        </div>

        <div className="border-t border-dotted border-black opacity-60 my-8" />

        {/* Invoice Meta */}
        <div className="space-y-4 mb-8 px-2">
          <div className="flex justify-between items-center text-2xl font-medium">
            <span>Invoice:</span>
            <span className="font-bold">{data.invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center text-2xl font-medium">
            <span>Date:</span>
            <span className="font-bold">{data.date}</span>
          </div>
        </div>

        <div className="border-t border-dotted border-black opacity-60 my-8" />

        {/* Items Table */}
        <div className="mb-6">
          {/* Header */}
          <div className="grid grid-cols-12 gap-1 mb-4 border-b-2 border-black pb-2">
            <div className="col-span-5 text-xl font-black uppercase">ITEM</div>
            <div className="col-span-1 text-xl font-black uppercase text-center">QTY</div>
            <div className="col-span-3 text-xl font-black uppercase text-right">PRICE</div>
            <div className="col-span-3 text-xl font-black uppercase text-right">TOTAL</div>
          </div>

          {/* Rows */}
          <div className="space-y-6">
            {data.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 items-start text-xl font-semibold">
                <div className="col-span-5 leading-tight uppercase pr-2">{item.name}</div>
                <div className="col-span-1 text-center">{item.quantity}</div>
                <div className="col-span-3 text-right whitespace-nowrap">Rs.{item.unitPrice.toLocaleString()}</div>
                <div className="col-span-3 text-right font-black whitespace-nowrap">Rs.{item.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-dotted border-black opacity-60 my-6" />

        {/* Totals Section */}
        <div className="space-y-1">
          <div className="flex justify-between items-center px-4 py-2 text-xl font-medium">
            <span>Subtotal</span>
            <span>Rs. {data.subtotal.toLocaleString()}</span>
          </div>
          
          {data.discount > 0 && (
            <div className="flex justify-between items-center px-4 py-3 text-xl font-medium bg-gray-100">
              <span>Discount ({data.discountPercentage || 0}%)</span>
              <span>-Rs. {data.discount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-center px-4 py-5 mt-2 bg-gray-200">
            <span className="text-4xl font-black uppercase tracking-tighter">Total</span>
            <span className="text-5xl font-black">
              <span className="text-2xl mr-1">Rs.</span>
              {data.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center mt-10 space-y-6">
          <div className="text-3xl font-black uppercase tracking-widest bg-black text-white px-6 py-1">
            {data.paymentMethod}
          </div>
          
          <div 
            className="text-6xl text-center py-2"
            style={{ 
              fontFamily: "'Dancing Script', cursive", 
              fontWeight: 700 
            }}
          >
            Thank You!
          </div>
          
          <div className="text-xl font-black uppercase tracking-[0.2em] text-center border-t border-black pt-4 w-full">
            THANK YOU! COME AGAIN
          </div>
        </div>

        {/* Google Fonts Import */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
          * { font-family: 'Inter', sans-serif; }
        `}} />

      </div>
    </div>
  );
};

export default ModernReceiptUI;
