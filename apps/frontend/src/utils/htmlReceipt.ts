import { toTitleCase } from './format';

export const generateHTMLReceipt = (orderData: any, settings?: any, logoUrl?: string, receiptType: 'NORMAL' | 'PARTY_ADVANCE' | 'PARTY_FINAL' = 'NORMAL') => {
    const isParty = receiptType === 'PARTY_ADVANCE' || receiptType === 'PARTY_FINAL';
    
    // Flatten item name/price/qty for printing
    let items = [];
    if (isParty) {
        const rawItems = orderData.items;
        const parsedItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);
        
        items = parsedItems.map((item: any) => {
            let unitPrice = 0;
            if (item.packageId) {
                unitPrice = parseFloat(item.package?.price || '0');
            } else if (item.productId) {
                unitPrice = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
                if (item.selectedAddons) {
                    unitPrice += item.selectedAddons.reduce((sum: number, a: any) => sum + parseFloat(a.price), 0);
                }
            } else if (item.addonIds && item.selectedAddons) {
                unitPrice = parseFloat(item.selectedAddons[0]?.price || '0');
            }

            const rawName = item.package?.name || item.product?.name || item.name || 'Item';
            const sizeName = typeof item.size === 'string' ? item.size : (item.size?.name || item.sizeName || null);
            
            // Truncate name if it's too long to allow space for the size
            const maxChars = 45;
            const displayName = rawName.replace(/\(RETAIL\)/gi, '').trim();
            const finalName = displayName.length > maxChars ? displayName.substring(0, maxChars - 3) + '...' : displayName;

            const addons = (item.selectedAddons || []).map((a: any) => a.name);
            
            return {
                name: toTitleCase(finalName),
                size: toTitleCase(sizeName),
                addons: addons.map((a: any) => toTitleCase(a)),
                qty: item.quantity || 1,
                unitPrice,
                itemTotal: unitPrice * (item.quantity || 1)
            };
        });

        if (Number(orderData.hallCharge) > 0) {
            items.push({ name: 'Hall Charge (Exclusive)', qty: 1, unitPrice: Number(orderData.hallCharge), itemTotal: Number(orderData.hallCharge) });
        }
        if (Number(orderData.addonsTotal) > 0) {
            items.push({ name: 'Additional Extras', qty: 1, unitPrice: Number(orderData.addonsTotal), itemTotal: Number(orderData.addonsTotal) });
        }
    } else {
        items = (orderData.orderItems || orderData.items || []).map((item: any) => {
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
            
            if (unitPrice === 0) {
                const totalVal = Number(item.total || item.totalPrice || item.itemTotal || 0);
                if (totalVal > 0) unitPrice = totalVal / qty;
            }

            const rawName = (item.productName || item.product?.name || item.name || 'Item').replace(/\(RETAIL\)/gi, '').trim();
            const sizeName = item.sizeName || 
                             item.productSize?.name || 
                             (typeof item.size === 'string' ? item.size : item.size?.name) || 
                             item.variantName || 
                             null;
            
            const maxChars = 45;
            const displayNameRaw = rawName.replace(/\(RETAIL\)/gi, '').trim();
            const displayName = displayNameRaw.length > maxChars ? displayNameRaw.substring(0, maxChars - 3) + '...' : displayNameRaw;

            const addons = (item.addons || item.orderItemAddons || []).map((a: any) => a.addonName || a.addon?.name || a.name);

            const itemTotal = Number(item.total || item.itemTotal || (unitPrice * qty));
            return { 
                name: toTitleCase(displayName), 
                size: toTitleCase(sizeName), 
                addons: addons.map((a: any) => toTitleCase(a)), 
                qty, 
                unitPrice, 
                itemTotal,
                type: item.type || item.product?.type || 'FOOD'
            };
        });
    }

    const foodItems = items.filter((i: any) => i.type !== 'RETAIL');
    const retailItems = items.filter((i: any) => i.type === 'RETAIL');
    
    const renderItemRow = (item: any) => `
        <tr>
            <td class="col-item font-bold">
                ${item.name.toUpperCase()}
                ${item.size ? `
                    <span style="font-size: 10px; font-weight: 800; color: #444; margin-left: 4px; vertical-align: middle;">
                        (${item.size.toUpperCase()})
                    </span>
                ` : ''}
                ${item.addons && item.addons.length > 0 ? `
                    <div style="font-size: 10px; font-weight: normal; color: #666; margin-top: 1px;">
                        + ${item.addons.join(', ')}
                    </div>
                ` : ''}
            </td>
            <td class="col-qty font-bold">${item.qty}</td>
            <td class="col-price">${formatCurrency(item.unitPrice)}</td>
            <td class="col-total font-black">${formatCurrency(item.itemTotal)}</td>
        </tr>
    `;

    const subTotal = isParty 
        ? (Number(orderData.hallCharge || 0) + Number(orderData.menuTotal || 0) + Number(orderData.addonsTotal || 0))
        : Number(orderData.subTotal || orderData.subtotal || 0);

    const discountAmt = Number(orderData.discount || 0);
    const serviceChargeAmt = Number(orderData.serviceCharge || 0);
    
    const total = isParty ? Number(orderData.totalAmount || 0) : Number(orderData.grandTotal || 0);
    const advancePaid = Number(orderData.advancePaid || 0);
    const balanceDue = total - advancePaid;

    const discountPercentage = isParty ? 0 : (orderData.discountPercentage || (subTotal > 0 ? Math.round((discountAmt / subTotal) * 100) : 0));
    
    const paymentMethod = orderData.paymentMethod || 'CASH';

    const actualDate = isParty ? orderData.eventDate : (orderData.date || new Date());
    const dateStr = actualDate ? new Date(actualDate).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }) : new Date().toLocaleString('en-GB');

    const formatCurrency = (amount: number) => Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getReceiptHeader = () => {
        if (receiptType === 'PARTY_ADVANCE') return 'BOOKING CONFIRMATION - ADVANCE RECEIPT';
        if (receiptType === 'PARTY_FINAL') return 'FINAL INVOICE - PARTY BOOKING';
        return null;
    };

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

    const invoiceNo = isParty 
        ? `PB-${(orderData.id || '0000').slice(0, 8).toUpperCase()}`
        : (orderData.invoiceNumber || "INV-000");

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt - ${invoiceNo}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Great+Vibes&display=swap');
                
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
                    width: 78mm;
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

                .bg-black {
                    background-color: #000;
                    color: #fff;
                    padding: 4px;
                    text-align: center;
                    font-weight: 900;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    font-size: 11px;
                }

                .line-clamp-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;  
                    overflow: hidden;
                    text-overflow: ellipsis;
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

                ${getReceiptHeader() ? `<div class="bg-black">${getReceiptHeader()}</div>` : ''}

                <div class="dashed-line"></div>

                <div class="flex justify-between" style="margin-bottom: 4px;">
                    <span style="color: #444;">Invoice:</span>
                    <span class="font-bold">${invoiceNo}</span>
                </div>
                <div class="flex justify-between">
                    <span style="color: #444;">${isParty ? 'Event Date' : 'Date'}:</span>
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
                        ${foodItems.map((item: any) => renderItemRow(item)).join('')}
                        ${(foodItems.length > 0 && retailItems.length > 0) ? `
                            <tr>
                                <td colspan="4" style="padding: 10px 0;">
                                    <div class="dashed-line" style="margin: 0;"></div>
                                </td>
                            </tr>
                        ` : ''}
                        ${retailItems.map((item: any) => renderItemRow(item)).join('')}
                    </tbody>
                </table>

                <div class="dashed-line"></div>

                ${receiptType === 'NORMAL' ? `
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
                ` : receiptType === 'PARTY_ADVANCE' ? `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px;">
                        <span>Base Total</span>
                        <span>Rs. ${formatCurrency(subTotal)}</span>
                    </div>

                    ${serviceChargeAmt > 0 ? `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; color: #2563eb;">
                        <span>Service Charge</span>
                        <span>Rs. ${formatCurrency(serviceChargeAmt)}</span>
                    </div>
                    ` : ''}

                    ${discountAmt > 0 ? `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; color: #dc2626;">
                        <span>Discount Applied</span>
                        <span>-Rs. ${formatCurrency(discountAmt)}</span>
                    </div>
                    ` : ''}

                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px;">
                        <span>Advance Paid</span>
                        <span>Rs. ${formatCurrency(advancePaid)}</span>
                    </div>
                    <div class="flex justify-between mt-2 bg-gray" style="padding: 12px 10px; margin-top: 12px; background-color: #000; color: #fff;">
                        <span class="font-black" style="font-size: 17px; text-transform: uppercase;">Balance Due</span>
                        <span class="font-black" style="font-size: 21px;">Rs. ${formatCurrency(balanceDue)}</span>
                    </div>
                ` : `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px;">
                        <span>Base Total</span>
                        <span>Rs. ${formatCurrency(subTotal)}</span>
                    </div>

                    ${serviceChargeAmt > 0 ? `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; color: #2563eb;">
                        <span>Service Charge</span>
                        <span>Rs. ${formatCurrency(serviceChargeAmt)}</span>
                    </div>
                    ` : ''}

                    ${discountAmt > 0 ? `
                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; color: #dc2626;">
                        <span>Discount Applied</span>
                        <span>-Rs. ${formatCurrency(discountAmt)}</span>
                    </div>
                    ` : ''}

                    <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; font-style: italic;">
                        <span>Less: Advance Paid</span>
                        <span>-Rs. ${formatCurrency(advancePaid)}</span>
                    </div>
                    <div class="flex justify-between mt-2 bg-gray" style="padding: 12px 10px; margin-top: 12px; background-color: #000; color: #fff;">
                        <span class="font-black" style="font-size: 15px; text-transform: uppercase;">Net Amount Payable</span>
                        <span class="font-black" style="font-size: 21px;">Rs. ${formatCurrency(balanceDue)}</span>
                    </div>
                `}

                <div class="text-center" style="margin-top: 30px;">
                    ${receiptType === 'NORMAL' ? `<div class="font-black" style="font-size: 16px;">PAID VIA ${paymentMethod.replace('PAID VIA ', '').toUpperCase()}</div>` : ''}
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
