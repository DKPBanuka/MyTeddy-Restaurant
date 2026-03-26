const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const admin = await prisma.user.upsert({
        where: { pin: '9999' },
        update: {},
        create: {
            name: 'Admin User',
            pin: '9999',
            role: 'ADMIN',
        }
    });
    console.log('Admin created:', admin);
}
main().finally(() => prisma.$disconnect());
