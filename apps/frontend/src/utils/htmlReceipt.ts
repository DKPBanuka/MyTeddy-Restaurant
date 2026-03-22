/**
 * Generates and prints an HTML receipt for thermal printers with exact CSS constraints.
 * Translated from the ModernReceiptUI React component for direct-to-printer usage.
 */

const getBearLogoSVG = () => `
  <svg width="100" height="100" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="50" r="28" fill="black" />
    <circle cx="140" cy="50" r="28" fill="black" />
    <circle cx="60" cy="50" r="15" fill="white" />
    <circle cx="140" cy="50" r="15" fill="white" />
    <circle cx="100" cy="110" r="75" fill="white" stroke="black" strokeWidth="6" />
    <path d="M75 35C75 15 125 15 125 35V50H75V35Z" fill="white" stroke="black" strokeWidth="5" />
    <path d="M65 50H135V65C135 70 130 73 125 73H75C70 73 65 70 65 65V50Z" fill="white" stroke="black" strokeWidth="5" />
    <circle cx="75" cy="115" r="7" fill="black" />
    <circle cx="125" cy="115" r="7" fill="black" />
    <ellipse cx="100" cy="145" rx="28" ry="22" fill="#f3f4f6" stroke="black" strokeWidth="3" />
    <path d="M90 138C90 138 100 130 110 138" stroke="black" strokeWidth="3" strokeLinecap="round" />
    <circle cx="100" cy="145" r="10" fill="black" />
    <path d="M100 155V162M100 162C95 162 90 159 90 159M100 162C105 162 110 159 110 159" stroke="black" strokeWidth="3" strokeLinecap="round" />
    <path d="M35 100V150M25 100H45" stroke="black" strokeWidth="4" strokeLinecap="round" />
    <path d="M165 100V150M155 100C155 100 155 115 175 115" stroke="black" strokeWidth="4" strokeLinecap="round" />
  </svg>
`;

export const generateHTMLReceipt = (orderData: any, settings?: any) => {
    const items = orderData.orderItems || orderData.items || [];
    const subTotal = Number(orderData.subTotal || orderData.subtotal || 0);
    const discount = Number(orderData.discount || 0);
    const discountPercentage = orderData.discountPercentage || (subTotal > 0 ? Math.round((discount / subTotal) * 100) : 0);
    const taxAmount = Number(orderData.tax || 0);
    const grandTotal = Number(orderData.grandTotal || 0);

    const dateStr = orderData.date || new Date().toLocaleString('en-GB', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true 
    });

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt - ${orderData.invoiceNumber || 'INV'}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Dancing+Script:wght@700&display=swap');
                
                @page { margin: 0; }
                body {
                    margin: 0;
                    padding: 8mm;
                    font-family: 'Inter', sans-serif;
                    width: 72mm;
                    color: #000;
                    background: #fff;
                }
                .container { width: 100%; max-width: 72mm; margin: 0 auto; }
                
                /* Typography */
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-black { font-weight: 900; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                
                .text-xs { font-size: 10px; }
                .text-base { font-size: 14px; }
                .text-lg { font-size: 16px; }
                .text-xl { font-size: 18px; }
                .text-2xl { font-size: 22px; }
                .text-4xl { font-size: 32px; }
                .text-5xl { font-size: 44px; }
                .text-6xl { font-size: 56px; }

                /* Layout */
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .items-center { align-items: center; }
                .flex-col { flex-direction: column; }
                
                .grid { display: grid; }
                .grid-12 { grid-template-columns: repeat(12, 1fr); gap: 4px; }
                .col-5 { grid-column: span 5; }
                .col-1 { grid-column: span 1; }
                .col-3 { grid-column: span 3; }
                
                .divider { border-top: 2px dotted #000; margin: 6mm 0; opacity: 0.6; }
                .border-b-2 { border-bottom: 2px solid #000; }
                .pb-2 { padding-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .mt-2 { margin-top: 8px; }
                .px-4 { padding-left: 16px; padding-right: 16px; }
                .py-3 { padding-top: 12px; padding-bottom: 12px; }
                .py-5 { padding-top: 20px; padding-bottom: 20px; }

                .bg-gray-100 { background-color: #f3f4f6; }
                .bg-gray-200 { background-color: #e5e7eb; }
                .bg-black { background-color: #000; }
                .text-white { color: #fff; }

                .logo-container { transform: scale(1.4); margin-bottom: 4mm; }
                .brand-header { letter-spacing: 0.4em; border-bottom: 2px solid #00; padding-bottom: 4px; display: inline-block; margin-bottom: 4mm; }
                
                .script-font { font-family: 'Dancing Script', cursive; line-height: 1; }

                @media print {
                    body { padding: 5mm; width: 72mm; }
                    .container { width: 72mm; }
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header Section -->
                <div class="text-center" style="margin-bottom: 8mm;">
                    <div class="logo-container">
                        ${getBearLogoSVG()}
                    </div>
                    <div class="brand-header text-xs font-black uppercase">MY TEDDY</div>
                    <h1 class="text-4xl font-black uppercase tracking-tight" style="margin: 0;">${settings?.restaurantName || 'MYTEDDY RESTAURANT'}</h1>
                    <div class="text-xl font-medium" style="margin-top: 3mm;">
                        <div>${settings?.address || '123, Galle Road, Colombo'}</div>
                        <div>Tel: ${settings?.phone || '+94 11 234 5678'}</div>
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Meta Details -->
                <div style="margin-bottom: 8mm;">
                    <div class="flex justify-between text-xl font-medium" style="margin-bottom: 3mm;">
                        <span>Invoice:</span>
                        <span class="font-bold">${orderData.invoiceNumber || 'INV-000'}</span>
                    </div>
                    <div class="flex justify-between text-xl font-medium">
                        <span>Date:</span>
                        <span class="font-bold">${dateStr}</span>
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Items Table -->
                <div style="margin-bottom: 6mm;">
                    <div class="grid grid-12 border-b-2 pb-2 mb-4">
                        <div class="col-5 text-lg font-black uppercase">ITEM</div>
                        <div class="col-1 text-lg font-black uppercase text-center">QTY</div>
                        <div class="col-3 text-lg font-black uppercase text-right">PRICE</div>
                        <div class="col-3 text-lg font-black uppercase text-right">TOTAL</div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${items.map((item: any) => {
                            const name = item.productName || item.product?.name || item.name || 'Item';
                            const qty = item.quantity || 1;
                            const unitPrice = Number(item.price || item.unitPrice || 0);
                            const total = Number(item.total || (unitPrice * qty));

                            return `
                                <div class="grid grid-12 text-lg font-semibold items-start">
                                    <div class="col-5 uppercase" style="line-height: 1.2;">${name}</div>
                                    <div class="col-1 text-center">${qty}</div>
                                    <div class="col-3 text-right">Rs.${unitPrice.toLocaleString()}</div>
                                    <div class="col-3 text-right font-black">Rs.${total.toLocaleString()}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="divider"></div>

                <!-- Totals Section -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="flex justify-between px-4 py-3 text-xl font-medium">
                        <span>Subtotal</span>
                        <span>Rs. ${subTotal.toLocaleString()}</span>
                    </div>
                    
                    ${discount > 0 ? `
                        <div class="flex justify-between px-4 py-3 text-xl font-medium bg-gray-100">
                            <span>Discount (${discountPercentage}%)</span>
                            <span>-Rs. ${discount.toLocaleString()}</span>
                        </div>
                    ` : ''}

                    ${taxAmount > 0 ? `
                        <div class="flex justify-between px-4 py-3 text-xl font-medium">
                            <span>Tax</span>
                            <span>Rs. ${taxAmount.toLocaleString()}</span>
                        </div>
                    ` : ''}

                    <div class="flex justify-between px-4 py-5 bg-gray-200" style="margin-top: 8px;">
                        <span class="text-4xl font-black uppercase tracking-tighter">Total</span>
                        <span class="text-5xl font-black">
                            <span class="text-xl" style="vertical-align: top; margin-right: 4px;">Rs.</span>
                            ${grandTotal.toLocaleString()}
                        </span>
                    </div>
                </div>

                <!-- Footer -->
                <div class="text-center" style="margin-top: 10mm;">
                    <div class="bg-black text-white text-3xl font-black uppercase py-2 mb-6" style="letter-spacing: 0.1em;">
                        ${orderData.paymentMethod?.toUpperCase() || 'PAID VIA CARD'}
                    </div>
                    
                    <div class="text-6xl script-font" style="margin-bottom: 4mm;">
                        Thank You!
                    </div>
                    
                    <div class="text-xl font-black uppercase tracking-widest border-t-2 border-black pt-4">
                        THANK YOU! COME AGAIN
                    </div>
                </div>
            </div>

            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=800');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    }
};
