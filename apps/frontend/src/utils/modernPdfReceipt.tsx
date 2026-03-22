import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Group addons to display under items
const getGroupedAddons = (selectedAddons: any[]) => {
    if (!selectedAddons) return [];
    const acc: Record<string, { name: string, count: number, price: number }> = {};
    selectedAddons.forEach(addon => {
        if (!acc[addon.id]) acc[addon.id] = { name: addon.name, count: 0, price: Number(addon.price) };
        acc[addon.id].count++;
    });
    return Object.values(acc);
};

const ReceiptContent: React.FC<{ orderData: any, settings: any }> = ({ orderData, settings }) => {
    const items = orderData.orderItems || orderData.items || [];
    const dateStr = new Date().toLocaleString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    });

    return (
        <div id="receipt-capture-zone" style={{
            width: '300px', // Slightly narrower for better margins in 80mm
            backgroundColor: '#ffffff', 
            color: '#000000', 
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif', 
            padding: '20px', 
            boxSizing: 'border-box',
            WebkitFontSmoothing: 'antialiased',
        }}>
            {/* Header Logo & Info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {settings?.logoUrl ? (
                    <div style={{ marginBottom: '12px' }}>
                        <img 
                            src={settings.logoUrl} 
                            alt="Logo" 
                            style={{ 
                                maxWidth: '160px', // Increased from 120px
                                maxHeight: '90px', // Increased from 60px
                                objectFit: 'contain',
                                display: 'inline-block' 
                            }} 
                        />
                    </div>
                ) : (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ 
                            width: '50px', 
                            height: '50px', 
                            border: '2px solid #000', 
                            borderRadius: '10px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '24px'
                        }}>T</div>
                    </div>
                )}
                
                <h1 style={{ 
                    fontSize: '20px', 
                    margin: '0 0 6px 0', 
                    fontWeight: '900', 
                    letterSpacing: '-0.5px',
                    lineHeight: '1.1'
                }}>
                    {settings?.restaurantName?.toUpperCase() || 'MYTEDDY RESTAURANT'}
                </h1>
                
                <div style={{ fontSize: '12px', color: '#111', lineHeight: '1.4' }}>
                    <div style={{ marginBottom: '2px' }}>{settings?.address || 'Main Street, City'}</div>
                    <div style={{ fontWeight: 'bold' }}>Tel: {settings?.phone || '0000000000'}</div>
                </div>
            </div>

            <div style={{ borderTop: '1.5px solid #000', margin: '12px 0' }} />

            {/* Invoice Meta */}
            <div style={{ fontSize: '11px', marginBottom: '4px', letterSpacing: '0.2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 'bold' }}>INVOICE:</span>
                    <span>{orderData.invoiceNumber || '---'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>DATE:</span>
                    <span>{dateStr}</span>
                </div>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '12px 0' }} />

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', paddingBottom: '6px', borderBottom: '1.5px solid #000', width: '45%' }}>ITEM</th>
                        <th style={{ textAlign: 'center', paddingBottom: '6px', borderBottom: '1.5px solid #000', width: '15%' }}>QTY</th>
                        <th style={{ textAlign: 'right', paddingBottom: '6px', borderBottom: '1.5px solid #000', width: '20%' }}>PRICE</th>
                        <th style={{ textAlign: 'right', paddingBottom: '6px', borderBottom: '1.5px solid #000', width: '20%' }}>TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item: any, idx: number) => {
                        // Priority: item.name (enriched), then product/package name
                        const name = item.name || item.product?.name || item.package?.name || 'Item';
                        const basePrice = Number(item.unitPrice || item.priceAtTimeOfSale || item.product?.price || 0);
                        const addons = item.selectedAddons || [];
                        const addonsTotal = addons.reduce((s: number, a: any) => s + Number(a.price), 0);
                        const unitPrice = basePrice + addonsTotal;
                        const lineTotal = unitPrice * item.quantity;
                        const groupedAddons = getGroupedAddons(addons);

                        return (
                            <React.Fragment key={idx}>
                                <tr>
                                    <td style={{ paddingTop: '8px', verticalAlign: 'top', fontWeight: 'bold' }}>
                                        {name}{item.size ? ` (${item.size.name})` : ''}
                                    </td>
                                    <td style={{ paddingTop: '8px', textAlign: 'center', verticalAlign: 'top' }}>
                                        {item.quantity}
                                    </td>
                                    <td style={{ paddingTop: '8px', textAlign: 'right', verticalAlign: 'top' }}>
                                        {unitPrice.toFixed(0)}
                                    </td>
                                    <td style={{ paddingTop: '8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 'bold' }}>
                                        {lineTotal.toFixed(0)}
                                    </td>
                                </tr>
                                {groupedAddons.map((a, aIdx) => (
                                    <tr key={`addon-${idx}-${aIdx}`}>
                                        <td colSpan={3} style={{ paddingLeft: '8px', fontSize: '10px', color: '#333' }}>
                                            + {a.count > 1 ? `${a.count}x ` : ''}{a.name}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: '10px' }}>{(a.count * a.price).toFixed(0)}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '12px 0' }} />

            {/* Totals Section */}
            <div style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Sub Total:</span>
                    <span>Rs. {Number(orderData.subTotal || 0).toFixed(0)}</span>
                </div>
                
                {Number(orderData.discount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#000' }}>
                        <span>Discount:</span>
                        <span>-Rs. {Number(orderData.discount).toFixed(0)}</span>
                    </div>
                )}

                {(settings?.taxRate || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Tax ({settings.taxRate}%):</span>
                        <span>Rs. {(Number(orderData.subTotal || 0) * settings.taxRate / 100).toFixed(0)}</span>
                    </div>
                )}

                <div style={{ 
                    marginTop: '10px', 
                    backgroundColor: '#000', 
                    color: '#fff', 
                    padding: '10px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    fontWeight: '900',
                    fontSize: '15px',
                    borderRadius: '4px'
                }}>
                    <span>TOTAL:</span>
                    <span>Rs. {Number(orderData.grandTotal || 0).toFixed(0)}</span>
                </div>
            </div>

            <div style={{ borderTop: '1.5px solid #000', margin: '16px 0 12px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Paid via {orderData.paymentMethod || 'CASH'}
                </div>
                
                <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '900', 
                    marginTop: '10px',
                    fontFamily: 'cursive',
                    letterSpacing: '0.5px'
                }}>
                    Thank You!
                </div>
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                    {settings?.receiptFooter || 'PREASE COME AGAIN'}
                </div>
            </div>
        </div>
    );
};

export const downloadModernPDFReceipt = async (orderData: any, settings: any) => {
    // 1. Create a hidden isolated div to render the React tree
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    // 2. Render Component
    const root = createRoot(container);
    root.render(<ReceiptContent orderData={orderData} settings={settings} />);

    // 3. Wait for fonts and inline SVG to flush to DOM
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 4. Capture Canvas
    const element = container.querySelector('#receipt-capture-zone') as HTMLElement;
    if (!element) return;

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Optimized scale (reduced from 3 to save space)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
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
        // Cleanup DOM
        root.unmount();
        document.body.removeChild(container);
    }
};
