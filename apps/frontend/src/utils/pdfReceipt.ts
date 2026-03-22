import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Inject the default Roboto Virtual File System dynamically
const vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs ? (pdfFonts as any).vfs : pdfFonts;
// @ts-expect-error - Expected due to mismatched pdfmake browser types vs ESModule typings.
pdfMake.vfs = vfs;

/**
 * Generates and prints a high-contrast monochrome PDF receipt for 80mm thermal printers.
 * Pixel-perfect refined version with shaded boxes and 3px dashed lines.
 */
export const generatePDFReceipt = (orderData: any, settings?: any) => {
    const items = orderData.orderItems || orderData.items || [];
    const subTotal = Number(orderData.subTotal || orderData.subtotal || 0);
    const discount = Number(orderData.discount || 0);
    const discountPercentage = orderData.discountPercentage || (subTotal > 0 ? Math.round((discount / subTotal) * 100) : 0);
    const taxAmount = Number(orderData.tax || 0);
    const grandTotal = Number(orderData.grandTotal || 0);
    const dateStr = orderData.date || new Date().toLocaleString('en-GB', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit',
        hour12: true 
    });

    const dashedLine = {
        canvas: [{
            type: 'line' as const,
            x1: 0, y1: 0,
            x2: 202, y2: 0,
            lineWidth: 1,
            dash: { length: 3, space: 3 }
        }],
        margin: [0, 5, 0, 5] as [number, number, number, number]
    };

    // Table Body Construction
    const tableBody: any[][] = [];

    // Header Row
    tableBody.push([
        { text: 'ITEM', style: 'tableHeader' },
        { text: 'QTY', style: 'tableHeader', alignment: 'center' as const },
        { text: 'PRICE', style: 'tableHeader', alignment: 'right' as const },
        { text: 'TOTAL', style: 'tableHeader', alignment: 'right' as const }
    ]);

    items.forEach((item: any) => {
        const name = item.productName || item.product?.name || item.name || 'Item';
        const qty = item.quantity || 1;
        const basePrice = Number(item.priceAtTimeOfSale || item.unitPrice || item.price || 0);
        const addons = item.selectedAddons || [];
        const addonsTotal = addons.reduce((s: number, a: any) => s + Number(a.price), 0);
        const unitPriceWithAddons = basePrice + addonsTotal;
        const lineTotal = unitPriceWithAddons * qty;

        // Main Item Row
        tableBody.push([
            { text: name.toUpperCase(), style: 'tableCell', bold: true },
            { text: qty.toString(), style: 'tableCell', alignment: 'center' as const },
            { text: basePrice.toLocaleString(), style: 'tableCell', alignment: 'right' as const },
            { text: lineTotal.toLocaleString(), style: 'tableCell', alignment: 'right' as const, bold: true }
        ]);

        // Addon Rows (save space)
        if (addons.length > 0) {
            const groupedAddons: Record<string, number> = {};
            addons.forEach((a: any) => {
                groupedAddons[a.name] = (groupedAddons[a.name] || 0) + 1;
            });

            Object.entries(groupedAddons).forEach(([aName, aCount]) => {
                tableBody.push([
                    { 
                        text: `+ ${aCount > 1 ? `${aCount}x ` : ''}${aName.toUpperCase()}`, 
                        style: 'addonCell', 
                        colSpan: 4,
                        margin: [8, 0, 0, 0] as [number, number, number, number]
                    },
                    {}, {}, {}
                ]);
            });
        }
    });

    const docDefinition: TDocumentDefinitions = {
        pageSize: { width: 226, height: 'auto' },
        pageMargins: [10, 10, 10, 10],
        content: [
            // Logo
            ...(settings?.logoUrl ? [{
                image: settings.logoUrl,
                width: 50,
                alignment: 'center' as const,
                margin: [0, 0, 0, 8] as [number, number, number, number]
            }] : []),

            // Brand Header
            { text: 'MY TEDDY', style: 'brandHeader' },
            { text: (settings?.restaurantName || 'MYTEDDY RESTAURANT').toUpperCase(), style: 'restaurantName' },
            { text: settings?.address || '123, Galle Road, Colombo', alignment: 'center' as const, fontSize: 10, margin: [0, 4, 0, 0] as [number, number, number, number] },
            { text: `Tel: ${settings?.phone || '+94 11 234 5678'}`, alignment: 'center' as const, fontSize: 10, margin: [0, 2, 0, 0] as [number, number, number, number] },

            dashedLine,

            // Meta Info - Side By Side
            {
                columns: [
                    {
                        text: `Invoice: ${orderData.invoiceNumber || 'INV-000'}`,
                        alignment: 'left' as const,
                        bold: true,
                        fontSize: 9
                    },
                    {
                        text: `Date: ${dateStr}`,
                        alignment: 'right' as const,
                        fontSize: 9
                    }
                ],
                margin: [0, 5, 0, 5] as [number, number, number, number]
            },

            dashedLine,

            // Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: 'noBorders',
                margin: [0, 5, 0, 5] as [number, number, number, number]
            },

            dashedLine,

            // Totals
            {
                margin: [0, 10, 0, 10] as [number, number, number, number],
                stack: [
                    {
                        columns: [
                            { text: 'Subtotal', alignment: 'right' as const, margin: [0, 0, 10, 0] },
                            { text: subTotal.toLocaleString(), alignment: 'right' as const, width: 60 }
                        ],
                        margin: [0, 0, 0, 4] as [number, number, number, number]
                    },
                    ...(discount > 0 ? [{
                        columns: [
                            { text: `Discount (${discountPercentage}%)`, alignment: 'right' as const, margin: [0, 0, 10, 0] },
                            { text: `-${discount.toLocaleString()}`, alignment: 'right' as const, width: 60 }
                        ],
                        margin: [0, 0, 0, 4] as [number, number, number, number]
                    }] : []),
                    ...(taxAmount > 0 ? [{
                        columns: [
                            { text: 'Tax', alignment: 'right' as const, margin: [0, 0, 10, 0] },
                            { text: taxAmount.toLocaleString(), alignment: 'right' as const, width: 60 }
                        ],
                        margin: [0, 0, 0, 4] as [number, number, number, number]
                    }] : []),
                    
                    // Grand Total Box
                    {
                        table: {
                            widths: ['*', 'auto'],
                            body: [[
                                { text: 'TOTAL', alignment: 'left' as const, fontSize: 12, bold: true, border: [false, false, false, false] as [boolean, boolean, boolean, boolean], margin: [0, 2, 0, 2] as [number, number, number, number] },
                                { text: grandTotal.toLocaleString(), alignment: 'right' as const, fontSize: 20, bold: true, border: [false, false, false, false] as [boolean, boolean, boolean, boolean] }
                            ]]
                        },
                        layout: 'noBorders',
                        fillColor: '#EEEEEE',
                        margin: [0, 8, 0, 8] as [number, number, number, number],
                        padding: [5, 8, 5, 8] as [number, number, number, number]
                    }
                ]
            },

            // Footer
            {
                stack: [
                    {
                        table: {
                            widths: ['*'],
                            body: [[
                                { 
                                    text: `PAID VIA ${orderData.paymentMethod?.toUpperCase() || 'CARD'}`, 
                                    alignment: 'center' as const, 
                                    bold: true, 
                                    fontSize: 14, 
                                    border: [false, false, false, false] as [boolean, boolean, boolean, boolean],
                                    margin: [0, 5, 0, 5] as [number, number, number, number]
                                }
                            ]]
                        },
                        layout: 'noBorders',
                        fillColor: '#000000',
                        color: '#FFFFFF',
                        margin: [0, 10, 0, 10] as [number, number, number, number]
                    },
                    { text: 'Thank You!', alignment: 'center' as const, fontSize: 18, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
                    { text: (settings?.receiptFooter || 'THANK YOU! COME AGAIN').toUpperCase(), style: 'footer', alignment: 'center' as const }
                ],
                margin: [0, 10, 0, 0] as [number, number, number, number]
            }
        ],
        styles: {
            brandHeader: {
                fontSize: 8,
                bold: true,
                alignment: 'center' as const,
                characterSpacing: 3,
                margin: [0, 0, 0, 4] as [number, number, number, number]
            },
            restaurantName: {
                fontSize: 16,
                bold: true,
                alignment: 'center' as const,
                lineHeight: 1
            },
            tableHeader: {
                fontSize: 8,
                bold: true,
                margin: [0, 2, 0, 4] as [number, number, number, number]
            },
            tableCell: {
                fontSize: 10,
                margin: [0, 2, 0, 2] as [number, number, number, number]
            },
            addonCell: {
                fontSize: 8,
                italics: true,
                color: '#444444'
            },
            footer: {
                fontSize: 10,
                bold: true,
                margin: [0, 2, 0, 0] as [number, number, number, number]
            }
        }
    };

    pdfMake.createPdf(docDefinition).print();
};
