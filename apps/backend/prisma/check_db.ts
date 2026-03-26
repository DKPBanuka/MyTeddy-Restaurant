import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { pin: '1234' },
        select: { id: true, name: true, role: true }
    });
    console.log('User with PIN 1234:', users);

    const perms = await prisma.rolePermission.findMany();
    console.log('All RolePermissions:', JSON.stringify(perms, null, 2));

    await prisma.$disconnect();
}

main();
