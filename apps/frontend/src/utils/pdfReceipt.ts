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
export const generatePDFReceipt = (orderData: CreateOrderDto, orderId: string = 'PENDING') => {

    // Construct the Table Body dynamically from the cart items
    const tableBody: any[][] = [
        // Table Header
        [
            { text: 'Item', style: 'tableHeader' },
            { text: 'Qty', style: 'tableHeader', alignment: 'center' },
            { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
            { text: 'Total', style: 'tableHeader', alignment: 'right' }
        ]
    ];

    // Populate Table Rows
    orderData.items.forEach(item => {
        // Safely map properties depending on if standard CreateOrderDto or extended UI type is passed
        const name = (item as any)?.product?.name || item.productId;
        const price = (item as any)?.product?.price || 0;
        const lineTotal = price * item.quantity;

        tableBody.push([
            { text: name, style: 'tableCell' },
            { text: item.quantity.toString(), style: 'tableCell', alignment: 'center' },
            { text: `$${Number(price).toFixed(2)}`, style: 'tableCell', alignment: 'right' },
            { text: `$${Number(lineTotal).toFixed(2)}`, style: 'tableCell', alignment: 'right' }
        ]);
    });

    // Custom layout to remove inner borders for a clean receipt look
    const cleanReceiptLayout: CustomTableLayout = {
        hLineWidth: function (i, node) {
            return (i === 0 || i === node.table.body.length) ? 1 : (i === 1) ? 1 : 0;
        },
        vLineWidth: function () { return 0; },
        hLineColor: function () { return '#dddddd'; },
        paddingTop: function () { return 5; },
        paddingBottom: function () { return 5; }
    };

    // Construct the Document Definition
    const documentDefinition: TDocumentDefinitions = {
        defaultStyle: {
            font: 'Roboto', // Use standard built-in Roboto font
            fontSize: 10
        },
        pageSize: 'A5', // Standard receipt size (or use roll widths like { width: 226, height: 'auto' } for thermal)
        pageMargins: [20, 30, 20, 30],
        content: [
            // Header
            { text: 'Teddy Co. POS', style: 'header', alignment: 'center' },
            { text: '123 Main Street, City', alignment: 'center', margin: [0, 0, 0, 2] },
            { text: 'Tel: +94 11 234 5678', alignment: 'center', margin: [0, 0, 0, 15] },

            // Order Info
            {
                columns: [
                    { text: `Receipt #: ${orderId.substring(0, 8).toUpperCase()}`, alignment: 'left' },
                    { text: `Date: ${new Date().toLocaleDateString()}`, alignment: 'right' }
                ],
                margin: [0, 0, 0, 10]
            },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: tableBody
                },
                layout: cleanReceiptLayout,
                margin: [0, 0, 0, 15]
            },

            // Grand Total
            {
                columns: [
                    { text: 'GRAND TOTAL:', style: 'totalLabel', alignment: 'right', width: '*' },
                    { text: `$${orderData.totalAmount.toFixed(2)}`, style: 'totalValue', alignment: 'right', width: 60 }
                ],
                margin: [0, 0, 0, 20]
            },

            // English Greeting Footer
            { text: 'Thank you! Come again.', style: 'englishGreeting', alignment: 'center' }
        ],

        // Styles dictionary
        styles: {
            header: {
                fontSize: 18,
                bold: true,
                margin: [0, 0, 0, 5]
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: '#333333'
            },
            tableCell: {
                fontSize: 10,
                color: '#555555'
            },
            totalLabel: {
                bold: true,
                fontSize: 12
            },
            totalValue: {
                bold: true,
                fontSize: 14
            },
            englishGreeting: {
                fontSize: 11,
                italics: true,
                bold: true,
                color: '#444444'
            }
        }
    };

    // Build and Download the PDF
    pdfMake.createPdf(documentDefinition).download(`Receipt_${orderId.substring(0, 8)}.pdf`);
};
