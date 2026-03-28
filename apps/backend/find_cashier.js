const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cashier = await prisma.user.findFirst({ where: { role: 'CASHIER' } });
    console.log('Cashier found:', JSON.stringify(cashier, null, 2));
}

main().finally(() => prisma.$disconnect());
