// File: src/utils/htmlReceipt.ts

export const generateHTMLReceipt = (orderData: any, settings?: any, logoUrl?: string) => {
    const items = orderData.orderItems || orderData.items || [];
    const subTotal = Number(orderData.subTotal || orderData.subtotal || 0);
    const discountAmt = Number(orderData.discount || 0);
    const discountPercentage = orderData.discountPercentage || (subTotal > 0 ? Math.round((discountAmt / subTotal) * 100) : 0);
    const total = Number(orderData.grandTotal || 0);
    const paymentMethod = orderData.paymentMethod || 'CASH';

    const dateStr = orderData.date ? new Date(orderData.date).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }) : new Date().toLocaleString('en-GB');

    const formatCurrency = (amount: number) => Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Fallback Bear Logo if no Logo URL is provided in settings
    const bearLogoSvg = `
    <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: black;">
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
        <text x="50" y="85" font-family="cursive" font-size="12" text-anchor="middle" font-weight="bold">MY</text>
        <text x="50" y="95" font-family="serif" font-size="10" text-anchor="middle">TEDDY</text>
    </svg>`;

    const logoHtml = logoUrl 
        ? `<img src="${logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />`
        : bearLogoSvg;

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
                
                @page { margin: 0; }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: sans-serif;
                    color: black;
                    background: white;
                    display: flex;
                    justify-content: flex-start;
                }
                .receipt {
                    width: 72mm; /* 80mm paper printable area */
                    padding: 4mm;
                    font-size: 13px;
                    line-height: 1.4;
                    box-sizing: border-box;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .font-bold { font-weight: bold; }
                .mt-1 { margin-top: 4px; }
                .mt-2 { margin-top: 8px; }
                
                .dashed-line {
                    border-top: 1.5px dashed #666;
                    margin: 14px 0;
                }
                
                .grid-table {
                    display: grid;
                    grid-template-columns: 5fr 1.5fr 2fr 2.5fr;
                    gap: 4px;
                    align-items: start;
                }
                
                .bg-gray {
                    background-color: #e5e7eb;
                    padding: 6px;
                    border-radius: 4px;
                }

                /* This forces Chrome/Edge to print background colors */
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .signature {
                    font-family: 'Great Vibes', cursive;
                    font-size: 36px;
                    transform: rotate(-2deg);
                    margin: 12px 0;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="text-center">
                    <div style="width: 60px; height: 60px; margin: 0 auto 5px auto;">
                        ${logoHtml}
                    </div>
                    <h2 style="margin: 0; font-size: 18px; letter-spacing: 1px;">${(settings?.restaurantName || "MYTEDDY RESTAURANT").toUpperCase()}</h2>
                    <div style="margin-top: 4px;">${settings?.address || "123, Galle Road, Colombo"}</div>
                    <div>Tel: ${settings?.phone || "+94 11 234 5678"}</div>
                </div>

                <div class="dashed-line"></div>

                <div class="flex justify-between mb-1">
                    <span>Invoice:</span>
                    <span class="font-bold">${orderData.invoiceNumber || "INV-000"}</span>
                </div>
                <div class="flex justify-between">
                    <span>Date:</span>
                    <span class="font-bold">${dateStr}</span>
                </div>

                <div class="dashed-line"></div>

                <div class="grid-table font-bold" style="margin-bottom: 8px;">
                    <div>ITEM</div>
                    <div class="text-center">QTY</div>
                    <div class="text-right">PRICE</div>
                    <div class="text-right">TOTAL</div>
                </div>

                <div style="margin-bottom: 12px;">
                    ${items.map((item: any) => {
                        const name = item.productName || item.product?.name || item.name || 'Item';
                        const qty = item.quantity || item.qty || 1;
                        const unitPrice = Number(item.price || item.unitPrice || 0);
                        const itemTotal = Number(item.total || (unitPrice * qty));
                        return `
                        <div class="grid-table" style="margin-bottom: 6px;">
                            <div style="padding-right: 4px; line-height: 1.2;">${name}</div>
                            <div class="text-center">${qty}</div>
                            <div class="text-right">${formatCurrency(unitPrice)}</div>
                            <div class="text-right">${formatCurrency(itemTotal)}</div>
                        </div>
                        `;
                    }).join('')}
                </div>

                <div class="dashed-line"></div>

                <div class="flex justify-between mt-1 px-1">
                    <span>Subtotal</span>
                    <span>Rs. ${formatCurrency(subTotal)}</span>
                </div>

                ${discountAmt > 0 ? `
                <div class="flex justify-between mt-1 px-1 bg-gray">
                    <span>Discount (${discountPercentage}%)</span>
                    <span>-Rs. ${formatCurrency(discountAmt)}</span>
                </div>
                ` : ''}

                <div class="flex justify-between mt-2 bg-gray" style="padding: 10px 8px;">
                    <span class="font-bold" style="font-size: 18px;">Total</span>
                    <span class="font-bold" style="font-size: 20px;">Rs. ${formatCurrency(total)}</span>
                </div>

                <div class="text-center" style="margin-top: 30px;">
                    <div class="font-bold" style="font-size: 15px;">PAID VIA ${paymentMethod.replace('PAID VIA ', '').toUpperCase()}</div>
                    <div class="signature">Thank You!</div>
                    <div style="font-size: 13px; font-weight: bold; margin-top: 8px;">THANK YOU! COME AGAIN</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    // Delay is crucial: Allows Google Font 'Great Vibes' to load before printing
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }, 600);
                }
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
