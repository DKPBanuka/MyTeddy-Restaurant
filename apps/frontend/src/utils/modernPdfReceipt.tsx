import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ModernReceiptUI from '../components/ModernReceiptUI';

// (getGroupedAddons removed as it is now handled by formatter)


export const downloadModernPDFReceipt = async (orderData: any, settings: any) => {
    // Format dynamic data for the ModernReceiptUI component
    const items = (orderData.orderItems || orderData.items || []).map((oi: any) => {
        const basePrice = Number(oi.unitPrice || oi.priceAtTimeOfSale || oi.product?.price || 0);
        const addons = (oi.selectedAddons || []).map((a: any) => ({
            name: a.name,
            price: Number(a.price)
        }));
        const addonsTotal = addons.reduce((s: number, a: any) => s + a.price, 0);
        
        return {
            name: oi.name || oi.product?.name || oi.package?.name || 'Item',
            quantity: oi.quantity,
            unitPrice: basePrice,
            total: (basePrice + addonsTotal) * oi.quantity,
            addons: addons
        };
    });

    const dateStr = new Date().toLocaleString('en-GB', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Colombo'
    });

    const formattedOrderData = {
        invoiceNumber: orderData.invoiceNumber || '---',
        date: dateStr,
        items: items,
        subtotal: Number(orderData.subTotal || 0),
        discount: Number(orderData.discount || 0),
        discountPercentage: orderData.subTotal > 0 ? Math.round((Number(orderData.discount || 0) / Number(orderData.subTotal)) * 100) : 0,
        tax: Number(orderData.subTotal || 0) * (settings?.taxRate || 0) / 100,
        grandTotal: Number(orderData.grandTotal || 0),
        paymentMethod: `PAID VIA ${orderData.paymentMethod || 'CASH'}`
    };

    const formattedSettings = {
        restaurantName: settings?.restaurantName?.toUpperCase() || 'MYTEDDY RESTAURANT',
        address: settings?.address || 'Main Street, City',
        phone: settings?.phone || '0000000000'
    };

    // 1. Create a hidden isolated div to render the React tree
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
    document.body.appendChild(container);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('is-printing');

    const root = createRoot(container);
    root.render(
        <div 
            id="receipt-capture-zone" 
            style={{ 
                width: '350px', 
                backgroundColor: '#ffffff', 
                color: '#000000',
                fontFamily: 'sans-serif'
            }}
        >
            <ModernReceiptUI orderData={formattedOrderData} settings={formattedSettings} />
        </div>
    );

    // 3. Wait for fonts and inline SVG to flush to DOM
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 4. Capture Canvas
    const element = container.querySelector('#receipt-capture-zone') as HTMLElement;
    if (!element) return;

    try {
        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const clonedZone = clonedDoc.querySelector('#receipt-capture-zone') as HTMLElement;
                if (clonedZone) {
                    clonedZone.parentElement!.style.visibility = 'visible';
                    clonedZone.parentElement!.style.width = '350px';
                    clonedZone.parentElement!.style.height = 'auto';
                    clonedZone.parentElement!.style.overflow = 'visible';
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');

        // 5. Convert to 80mm generic PDF Layout. 
        // 80mm width. Auto height depending on receipt length.
        const pdfWidthMm = 80;
        const pdfHeightMm = (canvas.height * pdfWidthMm) / canvas.width;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidthMm, pdfHeightMm],
            compress: true // Enable compression
        });

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm);
        
        // Ensure filename has .pdf extension and handle special characters
        const safeInvoiceNumber = (orderData.invoiceNumber || 'Order').replace(/[^a-z0-9_-]/gi, '_');
        pdf.save(`Receipt_${safeInvoiceNumber}.pdf`);

        // Option to explicitly pop up and auto-print PDF in browser instead of raw download
        // const blobUrl = pdf.output('bloburl');
        // window.open(blobUrl, '_blank');

    } catch (error) {
        console.error('Failed to generate PDF receipt', error);
    } finally {
        // Restore body overflow and state
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('is-printing');
        // Cleanup DOM
        root.unmount();
        document.body.removeChild(container);
    }
};
