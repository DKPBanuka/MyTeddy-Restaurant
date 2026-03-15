/**
 * Generates and prints an HTML receipt for thermal printers with exact CSS constraints.
 */
export const generateHTMLReceipt = (orderData: any, settings?: any) => {
    const items = orderData.orderItems || orderData.items || [];

    // Group addons for display
    const getGroupedAddons = (selectedAddons: any[]) => {
        if (!selectedAddons) return [];
        const acc: Record<string, { name: string, count: number, price: number }> = {};
        selectedAddons.forEach(addon => {
            if (!acc[addon.id]) acc[addon.id] = { name: addon.name, count: 0, price: Number(addon.price) };
            acc[addon.id].count++;
        });
        return Object.values(acc);
    };

    const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 10mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    width: 72mm; /* Standard thermal width */
                    color: #000;
                }
                .container {
                    width: 100%;
                    max-width: 72mm;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .header { margin-bottom: 5mm; }
                .header h1 { font-size: 16px; margin: 0; }
                .divider { border-top: 1px dashed #000; margin: 2mm 0; }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2mm 0;
                }
                th {
                    text-align: left;
                    border-bottom: 1px dashed #000;
                    padding: 1mm 0;
                }
                td {
                    padding: 1mm 0;
                    vertical-align: top;
                }
                .addon-row td {
                    font-size: 10px;
                    padding-left: 3mm;
                    font-style: italic;
                }
                .totals-table td {
                    padding: 0.5mm 0;
                }
                .grand-total {
                    font-size: 14px;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    padding: 2mm 0;
                    margin-top: 2mm;
                }
                .footer {
                    margin-top: 5mm;
                    font-size: 10px;
                }

                @media print {
                    body {
                        padding: 0;
                        width: 100%;
                    }
                    .container {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header text-center">
                    <h1>${settings?.restaurantName || 'MY TEDDY POS'}</h1>
                    <div>${settings?.address || ''}</div>
                    <div>Tel: ${settings?.phone || ''}</div>
                </div>

                <div class="divider"></div>
                
                <div class="info">
                    <div class="bold">INVOICE: ${orderData.invoiceNumber || '---'}</div>
                    <div>Date: ${new Date().toLocaleString()}</div>
                </div>

                <div class="divider"></div>

                <table>
                    <thead>
                        <tr>
                            <th width="50%">ITEM</th>
                            <th width="10%" class="text-center">QTY</th>
                            <th width="40%" class="text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map((item: any) => {
        const name = item.product?.name || item.package?.name || 'Item';
        const basePrice = Number(item.priceAtTimeOfSale || item.unitPrice || 0);
        const addons = item.selectedAddons || [];
        const addonsTotal = addons.reduce((s: number, a: any) => s + Number(a.price), 0);
        const unitPrice = basePrice + addonsTotal;
        const lineTotal = unitPrice * item.quantity;
        const groupedAddons = getGroupedAddons(addons);

        return `
                                <tr>
                                    <td>${name}${item.size ? ` (${item.size.name})` : ''}</td>
                                    <td class="text-center">${item.quantity}</td>
                                    <td class="text-right">${lineTotal.toFixed(0)}</td>
                                </tr>
                                ${groupedAddons.map(a => `
                                    <tr class="addon-row">
                                        <td colspan="2">+ ${a.count > 1 ? `${a.count}x ` : ''}${a.name}</td>
                                        <td class="text-right">${(a.count * a.price).toFixed(0)}</td>
                                    </tr>
                                `).join('')}
                            `;
    }).join('')}
                    </tbody>
                </table>

                <div class="divider"></div>

                ${(Number(orderData.discount || 0) > 0 || (settings?.taxRate || 0) > 0) ? `
                    <table class="totals-table">
                        <tr>
                            <td class="text-right">Sub Total:</td>
                            <td class="text-right bold" width="30%">Rs. ${Number(orderData.subTotal || 0).toFixed(0)}</td>
                        </tr>
                        ${Number(orderData.discount || 0) > 0 ? `
                            <tr>
                                <td class="text-right">Discount${orderData.discountPercentage ? ` (${orderData.discountPercentage}%)` : ''}:</td>
                                <td class="text-right bold">-Rs. ${Number(orderData.discount).toFixed(0)}</td>
                            </tr>
                        ` : ''}
                        ${(settings?.taxRate || 0) > 0 ? `
                            <tr>
                                <td class="text-right">Tax (${settings.taxRate}%):</td>
                                <td class="text-right bold">Rs. ${(Number(orderData.subTotal || 0) * settings.taxRate / 100).toFixed(0)}</td>
                            </tr>
                        ` : ''}
                    </table>

                    <div class="grand-total text-right bold">
                        <span>GRAND TOTAL: </span>
                        <span>Rs. ${Number(orderData.grandTotal || 0).toFixed(0)}</span>
                    </div>
                ` : `
                    <div class="grand-total text-right bold">
                        <span>TOTAL: </span>
                        <span>Rs. ${Number(orderData.grandTotal || 0).toFixed(0)}</span>
                    </div>
                `}

                <div class="text-center footer">
                    <div class="bold">Payment: ${orderData.paymentMethod || 'CASH'}</div>
                    <div style="margin-top: 2mm">${settings?.receiptFooter || 'THANK YOU! COME AGAIN'}</div>
                </div>
            </div>

            <script>
                window.onload = () => {
                    window.print();
                    setTimeout(() => { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    // Print using a temporary iframe
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    }
};
