const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) throw new Error('No user found in DB');
        
        console.log('Using user ID:', user.id);
        const order = await prisma.order.create({
            data: {
                orderNumber: 'TEST-' + Date.now(),
                invoiceNumber: 'INV-' + Date.now(),
                totalAmount: 100,
                userId: user.id,
                paymentStatus: 'PARTIAL',
                status: 'PARTIALLY_PAID',
                subTotal: 100,
                grandTotal: 100,
                orderItems: {
                    create: []
                }
            }
        });
        console.log('SUCCESS: Generated order ID:', order.id);
        await prisma.order.delete({ where: { id: order.id } });
    } catch(e) {
        console.error('FAILED to create order:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
