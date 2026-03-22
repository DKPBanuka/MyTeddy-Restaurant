import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDFReceipt = async (orderData: any, settings: any, logoUrl?: string) => {
    // 1. Create a hidden element for rendering the receipt
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.visibility = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-9999';
    container.style.background = 'white';
    container.style.padding = '0';
    container.style.margin = '0';
    document.body.appendChild(container);

    const items = (orderData.orderItems || orderData.items || []).map((item: any) => {
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
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
        timeZone: 'Asia/Colombo'
    }) : new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });

    const formatCurrency = (amount: number) => Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

    container.innerHTML = `
        ${styleTag}
        <div class="receipt-pdf" id="receipt-content">
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0; padding: 0;">
                ${logoHtml}
                <div class="text-center" style="width: 100%; margin: 0; padding: 0;">
                    <h2 class="font-black" style="margin: 0; padding: 0; font-size: 20px; line-height: 1; letter-spacing: 0.5px;">${(settings?.restaurantName || "MYTEDDY RESTAURANT").toUpperCase()}</h2>
                    <div style="font-size: 13px; margin-top: 4px; color: #333; line-height: 1.2;">${settings?.address || "123, Galle Road, Colombo"}</div>
                    <div style="font-size: 13px; color: #333; line-height: 1.2;">Tel: ${settings?.phone || "+94 11 234 5678"}</div>
                </div>
            </div>

            <div class="dashed-line"></div>

            <div class="flex justify-between" style="font-size: 13px; margin-bottom: 4px;">
                <span style="color: #666;">Invoice:</span>
                <span class="font-bold">${orderData.invoiceNumber || "INV-000"}</span>
            </div>
            <div class="flex justify-between" style="font-size: 13px;">
                <span style="color: #666;">Date:</span>
                <span class="font-bold">${dateStr}</span>
            </div>

            <div class="dashed-line"></div>

            <table>
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

            ${(discountAmt > 0 || subTotal !== total) ? `
            <div class="flex justify-between font-bold" style="font-size: 14px; padding: 0 5px;">
                <span>Subtotal</span>
                <span>Rs. ${formatCurrency(subTotal)}</span>
            </div>
            ` : ''}

            ${discountAmt > 0 ? `
            <div class="flex justify-between font-bold bg-gray" style="font-size: 14px;">
                <span>Discount (${discountPercentage}%)</span>
                <span>-Rs. ${formatCurrency(discountAmt)}</span>
            </div>
            ` : ''}

            <div class="flex justify-between bg-gray" style="padding: 15px 10px; margin-top: 15px;">
                <span class="font-black" style="font-size: 20px; text-transform: uppercase;">Total</span>
                <span class="font-black" style="font-size: 22px;">Rs. ${formatCurrency(total)}</span>
            </div>

            <div class="text-center" style="margin-top: 30px; padding-bottom: 20px; width: 100%;">
                <div class="font-black" style="font-size: 16px; margin-bottom: 5px;">PAID VIA ${paymentMethod.replace('PAID VIA ', '').toUpperCase()}</div>
                <div class="signature">Thank You!</div>
            </div>
        </div>
    `;

    // 3. Temporarily lock body to prevent layout shifts/nav bar flashing
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('is-printing');

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
        pdf.save(`Receipt-${orderData.invoiceNumber || 'INV'}.pdf`);
    } catch (error) {
        console.error('Failed to generate PDF receipt', error);
    } finally {
        // Restore body overflow and state
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('is-printing');
        // Cleanup DOM
        document.body.removeChild(container);
    }
};
