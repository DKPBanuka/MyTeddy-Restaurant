export const generateHTMLReceipt = (orderData: any, settings?: any, logoUrl?: string) => {
    // Flatten item name/price/qty for printing
    const items = (orderData.orderItems || orderData.items || []).map((item: any) => {
        const name = item.productName || item.product?.name || item.name || 'Item';
        const qty = item.quantity || item.qty || 1;
        
        // Priority extraction: item.price first (matching ModernReceiptUI), then others
        // Avoid "0.00" strings being picked up as truthy but zero
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
        
        // Final fallback: derived from total if price still zero
        if (unitPrice === 0) {
            const totalVal = Number(item.total || item.totalPrice || item.itemTotal || 0);
            if (totalVal > 0) unitPrice = totalVal / qty;
        }

        const itemTotal = Number(item.total || item.itemTotal || (unitPrice * qty));

        return { name, qty, unitPrice, itemTotal };
    });

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
        <text x="50" y="85" font-family="'Great Vibes', cursive" font-size="12" text-anchor="middle" font-weight="bold">MY</text>
        <text x="50" y="95" font-family="'Inter', sans-serif" font-size="10" text-anchor="middle">TEDDY</text>
    </svg>`;

    const logoHtml = logoUrl 
        ? `<img src="${logoUrl}" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />`
        : bearLogoSvg;

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt - ${orderData.invoiceNumber || 'INV'}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Great+Vibes&display=swap');
                
                /* EXPLICIT SIZE FOR 80mm PRINTERS */
                @page { 
                    size: 80mm auto; 
                    margin: 0; 
                }
                
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                    color: black;
                    background: #f0f0f0;
                    display: flex;
                    justify-content: center;
                }
                
                .receipt {
                    background: white;
                    width: 78mm; /* Fill nearly the whole 80mm width */
                    padding: 4mm;
                    font-size: 13px;
                    line-height: 1.4;
                    box-sizing: border-box;
                    min-height: 100vh;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .font-bold { font-weight: 600; }
                .font-black { font-weight: 900; }
                .mt-2 { margin-top: 8px; }
                
                .dashed-line {
                    border-top: 1.5px dashed #555;
                    margin: 12px 0;
                    width: 100%;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                }
                th {
                    font-weight: 800;
                    padding-bottom: 6px;
                    border-bottom: 1px solid #eee;
                }
                td {
                    padding: 4px 0;
                    vertical-align: top;
                }
                
                .col-item { width: 45%; text-align: left; padding-right: 4px; word-wrap: break-word; }
                .col-qty { width: 15%; text-align: center; }
                .col-price { width: 20%; text-align: right; white-space: nowrap; }
                .col-total { width: 20%; text-align: right; white-space: nowrap; }
                
                .bg-gray {
                    background-color: #f3f4f6;
                    padding: 8px;
                    border-radius: 6px;
                    margin: 8px 0;
                }

                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .signature {
                    font-family: 'Great Vibes', cursive;
                    font-size: 38px;
                    transform: rotate(-3deg);
                    margin: 15px 0;
                    font-weight: normal;
                }

                @media print {
                    body { background: white; padding: 0; }
                    .receipt { 
                        box-shadow: none; 
                        width: 78mm; 
                        margin: 0; 
                        padding: 3mm;
                        min-height: auto;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="text-center">
                    <div style="width: 68px; height: 68px; margin: 0 auto 10px auto;">
                        ${logoHtml}
                    </div>
                    <h2 class="font-black" style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">
                        ${(settings?.restaurantName || "MYTEDDY RESTAURANT").toUpperCase()}
                    </h2>
                    <div style="margin-top: 4px; font-weight: 500;">${settings?.address || "123, Galle Road, Colombo"}</div>
                    <div style="font-weight: 500;">Tel: ${settings?.phone || "+94 11 234 5678"}</div>
                </div>

                <div class="dashed-line"></div>

                <div class="flex justify-between" style="margin-bottom: 4px;">
                    <span style="color: #444;">Invoice:</span>
                    <span class="font-bold">${orderData.invoiceNumber || "INV-000"}</span>
                </div>
                <div class="flex justify-between">
                    <span style="color: #444;">Date:</span>
                    <span class="font-bold">${dateStr}</span>
                </div>

                <div class="dashed-line"></div>

                <table style="margin-bottom: 8px;">
                    <thead>
                        <tr>
                            <th class="col-item">ITEM</th>
                            <th class="col-qty">QTY</th>
                            <th class="col-price">PRICE</th>
                            <th class="col-total">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item: any) => `
                            <tr>
                                <td class="col-item font-bold">${item.name}</td>
                                <td class="col-qty font-bold">${item.qty}</td>
                                <td class="col-price">${formatCurrency(item.unitPrice)}</td>
                                <td class="col-total font-black">${formatCurrency(item.itemTotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="dashed-line"></div>

                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px;">
                    <span>Subtotal</span>
                    <span>Rs. ${formatCurrency(subTotal)}</span>
                </div>

                ${discountAmt > 0 ? `
                <div class="flex justify-between font-bold bg-gray" style="font-size: 14px; margin-top: 4px;">
                    <span>Discount (${discountPercentage}%)</span>
                    <span>-Rs. ${formatCurrency(discountAmt)}</span>
                </div>
                ` : ''}

                <div class="flex justify-between mt-2 bg-gray" style="padding: 12px 10px; margin-top: 12px;">
                    <span class="font-black" style="font-size: 19px; text-transform: uppercase;">Total</span>
                    <span class="font-black" style="font-size: 21px;">Rs. ${formatCurrency(total)}</span>
                </div>

                <div class="text-center" style="margin-top: 30px;">
                    <div class="font-black" style="font-size: 16px;">PAID VIA ${paymentMethod.replace('PAID VIA ', '').toUpperCase()}</div>
                    <div class="signature">Thank You!</div>
                    <div style="font-size: 14px; font-weight: 800; margin-top: 8px; letter-spacing: 1px;">THANK YOU! COME AGAIN</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }, 800);
                }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    }
};
