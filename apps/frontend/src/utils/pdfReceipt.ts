import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toTitleCase } from './format';

export const getReceiptHTML = (orderData: any, settings: any, logoUrl?: string, receiptType: 'NORMAL' | 'PARTY_ADVANCE' | 'PARTY_FINAL' = 'NORMAL'): string => {
    const isParty = receiptType === 'PARTY_ADVANCE' || receiptType === 'PARTY_FINAL';

    let items = [];
    if (isParty) {
        const rawItems = orderData.items;
        const parsedItems = typeof rawItems === 'string' ? JSON.parse(rawItems) : (rawItems || []);

        const addonAggregator: Record<string, { name: string, qty: number, unitPrice: number }> = {};

        const baseItems = parsedItems.map((item: any) => {
            let unitPrice = 0;
            if (item.packageId) {
                unitPrice = parseFloat(item.package?.price || '0');
            } else if (item.productId) {
                unitPrice = item.size ? parseFloat(item.size.price) : parseFloat(item.product?.price || '0');
            } else if (item.addonIds && item.selectedAddons) {
                unitPrice = parseFloat(item.selectedAddons[0]?.price || '0');
            }

            // Process sub-addons for this specific item
            if (item.selectedAddons && item.productId) {
                item.selectedAddons.forEach((addon: any) => {
                    const key = `${addon.name}-${addon.price}`;
                    const parentQty = item.quantity || 1;
                    if (addonAggregator[key]) {
                        addonAggregator[key].qty += parentQty;
                    } else {
                        addonAggregator[key] = {
                            name: addon.name,
                            qty: parentQty,
                            unitPrice: parseFloat(addon.price || '0')
                        };
                    }
                });
            }

            const rawName = item.package?.name || item.product?.name || item.name || 'Item';
            const sizeName = typeof item.size === 'string' ? item.size : (item.size?.name || item.sizeName || null);

            return {
                name: toTitleCase(rawName.replace(/\(RETAIL\)/gi, '').trim()),
                size: toTitleCase(sizeName),
                qty: item.quantity || 1,
                unitPrice,
                itemTotal: unitPrice * (item.quantity || 1),
                type: 'FOOD'
            };
        });

        // Convert aggregated addons to item rows
        const addonItems = Object.values(addonAggregator).map(addon => ({
            name: `+ ${toTitleCase(addon.name)}`,
            size: null,
            qty: addon.qty,
            unitPrice: addon.unitPrice,
            itemTotal: addon.unitPrice * addon.qty,
            type: 'FOOD'
        }));

        items = [...baseItems, ...addonItems];

        // Additional Extras moved to summary section
    } else {
        items = (orderData.orderItems || orderData.items || []).map((item: any) => {
            const rawName = item.productName || item.product?.name || item.name || 'Item';
            const nameWithoutRetail = toTitleCase(rawName.replace(/\(RETAIL\)/gi, '').trim());
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

            const sizeName = item.sizeName ||
                item.productSize?.name ||
                (typeof item.size === 'string' ? item.size : item.size?.name) ||
                item.variantName ||
                null;
            const finalSizeName = sizeName ? toTitleCase(sizeName as string) : null;

            const itemTotal = Number(item.total || item.itemTotal || (unitPrice * qty));
            return {
                name: nameWithoutRetail,
                size: finalSizeName,
                qty,
                unitPrice,
                itemTotal,
                type: item.type || item.product?.type || 'FOOD'
            };
        });

        // Consolidate Addons for Normal Receipts
        let grandAddonsTotal = 0;
        (orderData.orderItems || orderData.items || []).forEach((item: any) => {
            const itemAddons = (item.addons || item.selectedAddons || item.orderItemAddons || []);
            const itemAddonTotal = itemAddons.reduce((sum: number, a: any) => {
                const p = Number(a.price || a.addonPrice || a.unitPrice || 0);
                return sum + p;
            }, 0);
            const qty = item.quantity || item.qty || 1;
            grandAddonsTotal += (itemAddonTotal * qty);
        });

        if (grandAddonsTotal > 0) {
            items.push({
                name: 'Additional Items',
                size: null,
                qty: 1,
                unitPrice: grandAddonsTotal,
                itemTotal: grandAddonsTotal,
                type: 'FOOD'
            });
        }
    }

    const foodItems = items;

    const renderItemRow = (item: any) => `
        <tr>
            <td class="col-item font-bold">
                <div style="word-wrap: break-word;">
                    ${item.name}
                    ${item.size ? `
                        <div style="font-size: 13px; font-weight: 950; color: #000; margin-top: 2px;">
                            (${item.size})
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="col-qty font-bold">${item.qty}</td>
            <td class="col-price">${formatCurrency(item.unitPrice)}</td>
            <td class="col-total font-black">${formatCurrency(item.itemTotal)}</td>
        </tr>
    `;

    const subTotal = isParty
        ? (Number(orderData.hallCharge || 0) + Number(orderData.menuTotal || 0))
        : Number(orderData.subTotal || orderData.subtotal || 0);

    const addonsTotal = isParty ? Number(orderData.addonsTotal || 0) : 0;

    const discountAmt = Number(orderData.discount || 0);
    const serviceChargeAmt = Number(orderData.serviceCharge || 0);
    const total = isParty ? Number(orderData.totalAmount || 0) : Number(orderData.grandTotal || 0);
    const advancePaid = Number(orderData.advancePaid || 0);
    const balanceDue = total - advancePaid;

    const discountPercentage = isParty ? 0 : (subTotal > 0 ? Math.round((discountAmt / subTotal) * 100) : 0);
    const paymentMethod = orderData.paymentMethod || 'CASH';

    const getReceiptHeader = () => {
        if (receiptType === 'PARTY_ADVANCE') return 'BOOKING CONFIRMATION - ADVANCE RECEIPT';
        if (receiptType === 'PARTY_FINAL') return 'FINAL INVOICE - PARTY BOOKING';
        return null;
    };

    const now = new Date();
    const invoiceDateStr = now.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Colombo'
    });

    const eventDateStr = (isParty && orderData.eventDate) ? new Date(orderData.eventDate).toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Colombo'
    }) : null;

    const formatCurrency = (amount: number) => Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getPBDate = (dateStr: any) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${y}${m}${day}`;
    };

    const pbDatePrefix = getPBDate(orderData.eventDate || orderData.createdAt);

    const invoiceNo = isParty
        ? `PB-${pbDatePrefix}-${(orderData.id || '0000').slice(-4).toUpperCase()}`
        : (orderData.invoiceNumber || "INV-000");

    // Conditional Logo Logic - ZERO MARGIN for html2canvas gap fix
    const logoHtml = logoUrl
        ? `<div style="display: flex; justify-content: center; width: 100%; margin: 0; padding: 0;">
            <img src="${logoUrl}" style="width: 85px; height: 85px; object-fit: contain; display: block; margin: 0 auto;" />
           </div>`
        : '';

    const styleTag = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Great+Vibes&display=swap');
            
            .receipt-pdf {
                width: 80mm;
                padding: 6mm;
                background: white;
                font-family: 'Inter', sans-serif;
                color: black;
                line-height: 1.25; /* Tightened line height */
                box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .font-bold { font-weight: 600; }
            .font-black { font-weight: 900; }
            
            .dashed-line {
                border-top: 2px dashed #444;
                margin: 12px 0;
                width: 100%;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            th { text-align: left; padding-bottom: 8px; border-bottom: 1px solid #eee; font-size: 11px; }
            td { padding: 6px 0; vertical-align: top; font-size: 13px; }
            
            .col-item { width: 45%; word-wrap: break-word; }
            .col-qty { width: 15%; text-align: center; }
            .col-price { width: 20%; text-align: right; white-space: nowrap; }
            .col-total { width: 20%; text-align: right; white-space: nowrap; }
            
            .bg-gray {
                background-color: #f3f4f6;
                padding: 10px;
                border-radius: 8px;
                margin: 10px 0;
            }
            
            .signature {
                font-family: 'Great Vibes', cursive;
                font-size: 38px;
                transform: rotate(-3deg);
                margin: 15px 0 0 0; /* Minimized margin */
                line-height: 1;
            }
        </style>
    `;

    return `
        ${styleTag}
        <div class="receipt-pdf" id="receipt-content" style="width: 80mm;">
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0; padding: 0;">
                ${logoHtml}
                <div class="text-center" style="width: 100%; margin: 0; padding: 0;">
                    <h2 class="font-black" style="margin: 0; padding: 0; font-size: 20px; line-height: 1; letter-spacing: 0.5px;">${(settings?.restaurantName || "MYTEDDY RESTAURANT").toUpperCase()}</h2>
                    <div style="font-size: 13px; margin-top: 4px; color: #333; line-height: 1.2;">${settings?.address || "123, Galle Road, Colombo"}</div>
                    <div style="font-size: 13px; color: #333; line-height: 1.2;">Tel: ${settings?.phone || "+94 11 234 5678"}</div>
                </div>
            </div>

            ${getReceiptHeader() ? `<div style="background-color: #000; color: #fff; padding: 4px; text-align: center; font-weight: 900; margin: 10px 0; text-transform: uppercase; font-size: 11px;">${getReceiptHeader()}</div>` : ''}

            <div class="dashed-line"></div>

            <div class="flex justify-between font-bold" style="font-size: 11.5px; margin-bottom: 4px; color: #000; text-transform: uppercase; letter-spacing: -0.3px; white-space: nowrap;">
                <span style="flex-shrink: 0;">Invoice #:</span>
                <span class="font-black" style="overflow: hidden; text-overflow: ellipsis; padding-left: 4px;">${invoiceNo}</span>
            </div>
            <div class="flex justify-between font-bold" style="font-size: 11.5px; margin-bottom: 4px; color: #000; text-transform: uppercase; letter-spacing: -0.3px; white-space: nowrap;">
                <span style="flex-shrink: 0;">Inv. Date:</span>
                <span class="font-black" style="overflow: hidden; text-overflow: ellipsis; padding-left: 4px;">${invoiceDateStr}</span>
            </div>
            ${isParty && eventDateStr ? `
            <div class="flex justify-between font-bold" style="font-size: 11.5px; color: #000; text-transform: uppercase; letter-spacing: -0.3px; white-space: nowrap;">
                <span style="flex-shrink: 0;">Event Date:</span>
                <span class="font-black" style="overflow: hidden; text-overflow: ellipsis; padding-left: 4px;">${eventDateStr}</span>
            </div>
            ` : ''}

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
            ` : (receiptType === 'PARTY_ADVANCE' || receiptType === 'PARTY_FINAL') ? `
                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px;">
                    <span>Menu Total</span>
                    <span>Rs. ${formatCurrency(Number(orderData.menuTotal || 0))}</span>
                </div>

                ${Number(orderData.hallCharge || 0) > 0 ? `
                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px;">
                    <span>Hall Charge</span>
                    <span>Rs. ${formatCurrency(Number(orderData.hallCharge))}</span>
                </div>
                ` : ''}

                <div class="dashed-line" style="margin: 8px 0;"></div>

                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; color: #000;">
                    <span>Gross Base Value</span>
                    <span>Rs. ${formatCurrency(subTotal)}</span>
                </div>

                ${addonsTotal > 0 ? `
                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px;">
                    <span>Additional Extras</span>
                    <span>Rs. ${formatCurrency(addonsTotal)}</span>
                </div>
                ` : ''}

                ${serviceChargeAmt > 0 ? `
                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px;">
                    <span>Service Charge</span>
                    <span>Rs. ${formatCurrency(serviceChargeAmt)}</span>
                </div>
                ` : ''}

                ${discountAmt > 0 ? `
                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px;">
                    <span>Discount Applied</span>
                    <span>-Rs. ${formatCurrency(discountAmt)}</span>
                </div>
                ` : ''}

                <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 4px; margin-top: 4px; ${receiptType === 'PARTY_FINAL' ? 'font-style: italic;' : ''}">
                    <span>${receiptType === 'PARTY_FINAL' ? 'Less: ' : ''}Advance Paid</span>
                    <span>${receiptType === 'PARTY_FINAL' ? '-' : ''}Rs. ${formatCurrency(advancePaid)}</span>
                </div>
                
                <div class="flex justify-between mt-2 bg-gray" style="padding: 12px 10px; margin-top: 12px; background-color: #000; color: #fff;">
                    <span class="font-black" style="font-size: 15px; text-transform: uppercase;">${receiptType === 'PARTY_ADVANCE' ? 'Balance Due' : 'Net Amount Payable'}</span>
                    <span class="font-black" style="font-size: 21px;">Rs. ${formatCurrency(balanceDue)}</span>
                </div>
            ` : ''}

            <div class="text-center" style="margin-top: 30px; padding-bottom: 20px; width: 100%;">
                ${receiptType === 'NORMAL' ? `<div class="font-black" style="font-size: 16px; margin-bottom: 5px;">PAID VIA ${paymentMethod.replace('PAID VIA ', '').toUpperCase()}</div>` : ''}
                <div class="signature">Thank You!</div>
            </div>
        </div>
    `;
};

export const generatePDFReceipt = async (orderData: any, settings: any, logoUrl?: string, receiptType: 'NORMAL' | 'PARTY_ADVANCE' | 'PARTY_FINAL' = 'NORMAL') => {
    // 1. Create a hidden element for rendering the receipt
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '80mm';
    container.style.visibility = 'hidden';
    document.body.appendChild(container);

    container.innerHTML = getReceiptHTML(orderData, settings, logoUrl, receiptType);

    // 3. Temporarily lock body to prevent layout shifts/nav bar flashing
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('is-printing');

    const isParty = receiptType === 'PARTY_ADVANCE' || receiptType === 'PARTY_FINAL';
    const invoiceNo = isParty
        ? `PB-${(orderData.id || '0000').slice(-6).toUpperCase()}`
        : (orderData.invoiceNumber || "INV-000");

    try {
        // 4. Capture Canvas (Use onclone to unhide for capture)
        const element = document.getElementById('receipt-content');
        if (!element) throw new Error("Receipt content not found");

        const canvas = await html2canvas(element as HTMLElement, {
            scale: 4,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const clonedContent = clonedDoc.getElementById('receipt-content');
                if (clonedContent) {
                    clonedContent.parentElement!.style.visibility = 'visible';
                    clonedContent.parentElement!.style.width = '80mm';
                    clonedContent.parentElement!.style.height = 'auto';
                    clonedContent.parentElement!.style.overflow = 'visible';
                }
            }
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${invoiceNo}.pdf`);
    } catch (error) {
        console.error('Failed to generate PDF receipt', error);
        throw error; // Re-throw to show error in UI if needed
    } finally {
        // Restore body overflow and state
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('is-printing');
        // Cleanup DOM
        document.body.removeChild(container);
    }
};

export const printReceiptBrowser = (orderData: any, settings: any, logoUrl?: string, receiptType: 'NORMAL' | 'PARTY_ADVANCE' | 'PARTY_FINAL' = 'NORMAL') => {
    const htmlContent = getReceiptHTML(orderData, settings, logoUrl, receiptType);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
        console.error("Failed to access iframe document for printing.");
        return;
    }

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Print Receipt</title>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; background: white;">
                ${htmlContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.focus();
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    doc.close();

    // Clean up iframe after printing is likely complete
    setTimeout(() => {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }, 10000);
};
