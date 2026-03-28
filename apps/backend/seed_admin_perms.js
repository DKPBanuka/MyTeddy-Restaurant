const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const permissions = ["POS", "EVENTS", "INVENTORY", "REPORTS", "STAFF"];
    
    const adminPerms = await prisma.rolePermission.upsert({
        where: { role: 'ADMIN' },
        update: { permissions },
        create: { role: 'ADMIN', permissions }
    });
    
    console.log('Admin permissions seeded:', JSON.stringify(adminPerms, null, 2));
}

main().finally(() => prisma.$disconnect());
