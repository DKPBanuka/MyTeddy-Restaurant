const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const perms = await prisma.rolePermission.findMany();
    console.log('Permissions found:', JSON.stringify(perms, null, 2));
}

main().finally(() => prisma.$disconnect());
