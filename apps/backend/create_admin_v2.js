const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const admin = await prisma.user.upsert({
        where: { pin: '0000' },
        update: { role: 'ADMIN' },
        create: {
            name: 'Supiri Admin',
            pin: '0000',
            role: 'ADMIN',
            permissions: ['POS', 'REPORTS', 'EVENTS', 'INVENTORY', 'STAFF']
        }
    });
    console.log('Admin created/updated:', admin);
}
main().finally(() => prisma.$disconnect());
