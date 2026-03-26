import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting debug seed...');
    try {
        await prisma.rolePermission.deleteMany({});
        console.log('Deleted existing permissions');
        
        await prisma.rolePermission.create({
            data: {
                role: Role.ADMIN,
                permissions: ['POS', 'REPORTS', 'EVENTS', 'INVENTORY', 'STAFF', 'SETTINGS'],
            }
        });
        console.log('Created ADMIN permissions');

        await prisma.rolePermission.create({
            data: {
                role: Role.CASHIER,
                permissions: ['POS', 'REPORTS', 'EVENTS'],
            }
        });
        console.log('Created CASHIER permissions');
        
    } catch (err) {
        console.error('Debug seed error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
