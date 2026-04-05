const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        const res = await prisma.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'PaymentStatus'`);
        console.log('PaymentStatus values:', JSON.stringify(res));
        const res2 = await prisma.$queryRawUnsafe(`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'OrderStatus'`);
        console.log('OrderStatus values:', JSON.stringify(res2));
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
