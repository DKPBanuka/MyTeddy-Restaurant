const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({ 
        where: { type: 'RETAIL' }, 
        include: { retailStock: true } 
    });
    const missing = products.filter(p => !p.retailStock);
    console.log('Retail products missing stock:', missing.length);
    if (missing.length > 0) {
        console.log(JSON.stringify(missing.map(m => ({ id: m.id, name: m.name })), null, 2));
    }
}

main().finally(() => prisma.$disconnect());
