import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, CustomTableLayout } from 'pdfmake/interfaces';
import type { CreateOrderDto } from '../types';

// Inject the default Roboto Virtual File System dynamically to handle different bundler resolutions
const vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs ? (pdfFonts as any).vfs : pdfFonts;
// @ts-expect-error - Expected due to mismatched pdfmake browser types vs ESModule typings.
pdfMake.vfs = vfs;

/**
 * Generates and downloads an English PDF Receipt for a unified Order.
 * 
 * @param orderData The completed CreateOrderDto representing the cart.
 * @param orderId   (Optional) The generated Order ID from the backend to display.
 */
/**
 * Generates and downloads an English PDF Receipt for a thermal 80mm POS printer.
 * 
 * @param orderData The completed order data with totals and line items.
 * @param orderId   The generated Order ID or Invoice Number.
 */
export const generatePDFReceipt = (orderData: any, orderId: string) => {
    // Construct the Table Body dynamically from the order items
    const tableBody: any[][] = [
        // Table Header
        [
            { text: 'ITEM', style: 'tableHeader' },
            { text: 'QTY', style: 'tableHeader', alignment: 'center' },
            { text: 'PRICE', style: 'tableHeader', alignment: 'right' },
            { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    // Populate Table Rows
    const items = orderData.orderItems || orderData.items || [];
    items.forEach((item: any) => {
        const name = item.product?.name || item.package?.name || 'Item';
        const price = item.priceAtTimeOfSale || item.unitPrice || 0;
        const lineTotal = price * item.quantity;

        tableBody.push([
            { text: name, style: 'tableCell' },
            { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
            { text: Number(price).toFixed(0), style: 'tableCell', alignment: 'right' },
            { text: Number(lineTotal).toFixed(0), style: 'tableCell', alignment: 'right' }
        ]);
        
        // Show addons if any
        if (item.addonIds && item.addonIds.length > 0) {
            tableBody.push([
                { text: ` + Addons (${item.addonIds.length})`, style: 'addonCell', colSpan: 4 },
                {}, {}, {}
            ]);
        }
    });

    // Custom layout to remove inner borders for a clean thermal receipt look
    const cleanReceiptLayout: CustomTableLayout = {
        hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 1 : 0;
        },
        vLineWidth: function () { return 0; },
        hLineStyle: function () { return { dash: { length: 2 } }; },
        paddingTop: function () { return 2; },
        paddingBottom: function () { return 2; }
    };

    const subTotal = orderData.subTotal || orderData.totalAmount || 0;
    const discount = orderData.discount || 0;
    const grandTotal = orderData.grandTotal || orderData.totalAmount || 0;

    // Construct the Document Definition
    const documentDefinition: TDocumentDefinitions = {
        defaultStyle: {
            font: 'Roboto',
            fontSize: 9
        },
        // 80mm thermal paper is ~226 points wide
        pageSize: { width: 226, height: 'auto' },
        pageMargins: [12, 12, 12, 12],
        content: [
            // Header
            { text: 'MY TEDDY RESTAURANT', style: 'header', alignment: 'center' },
            { text: '123, Galle Road, Colombo', alignment: 'center', fontSize: 8 },
            { text: 'Tel: +94 11 234 5678', alignment: 'center', fontSize: 8, margin: [0, 0, 0, 10] },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 202, y2: 0, lineWidth: 1 }] },
            
            // Order Info
            {
                margin: [0, 8, 0, 8],
                stack: [
                    { text: `INVOICE: ${orderData.invoiceNumber || orderId}`, bold: true },
                    { text: `Date: ${new Date().toLocaleString()}`, fontSize: 8 },
                    { text: `Type: ${orderData.orderType || 'TAKEAWAY'}`, fontSize: 8 }
                ]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 202, y2: 0, lineWidth: 1 }] },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: cleanReceiptLayout,
                margin: [0, 5, 0, 5]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 202, y2: 0, lineWidth: 1 }] },

            // Totals
            {
                margin: [0, 8, 0, 12],
                stack: [
                    {
                        columns: [
                            { text: 'Sub Total:', alignment: 'right' },
                            { text: `Rs. ${Number(subTotal).toFixed(2)}`, alignment: 'right', width: 60 }
                        ]
                    },
                    {
                        columns: [
                            { text: 'Discount:', alignment: 'right' },
                            { text: `-Rs. ${Number(discount).toFixed(2)}`, alignment: 'right', width: 60 }
                        ]
                    },
                    {
                        columns: [
                            { text: 'GRAND TOTAL:', style: 'totalLabel', alignment: 'right' },
                            { text: `Rs. ${Number(grandTotal).toFixed(2)}`, style: 'totalLabel', alignment: 'right', width: 60 }
                        ],
                        margin: [0, 4, 0, 0]
                    }
                ]
            },

            // Payment Details
            {
                text: `Payment Mode: ${orderData.paymentMethod || 'CASH'}`,
                fontSize: 8,
                alignment: 'center',
                margin: [0, 0, 0, 15]
            },

            // Footer
            { text: 'THANK YOU! COME AGAIN', style: 'footer', alignment: 'center' },
            { text: 'Software by MyTeddy POS', fontSize: 7, alignment: 'center', color: '#888888', margin: [0, 5, 0, 0] }
        ],

        styles: {
            header: {
                fontSize: 12,
                bold: true,
                margin: [0, 0, 0, 2]
            },
            tableHeader: {
                bold: true,
                fontSize: 8,
                color: '#000000'
            },
            tableCell: {
                fontSize: 8
            },
            addonCell: {
                fontSize: 7,
                italics: true,
                color: '#444444'
            },
            totalLabel: {
                bold: true,
                fontSize: 10
            },
            footer: {
                fontSize: 9,
                bold: true
            }
        }
    };

    // Build and Download the PDF (In a real browser this triggers download, 
    // for thermal printers we usually use print() on an iframe or similar)
    pdfMake.createPdf(documentDefinition).download(`Invoice_${orderData.invoiceNumber || orderId}.pdf`);
};
