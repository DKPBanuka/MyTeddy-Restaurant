const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.user.count({ where: { role: 'CASHIER' } });
    console.log('Cashiers found:', count);
}

main().finally(() => prisma.$disconnect());
