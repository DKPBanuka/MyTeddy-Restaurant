const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const allPermissions = [
        'POS_ACCESS', 
        'KDS_ACCESS', 
        'REPORTS_VIEW', 
        'EVENTS_MANAGE', 
        'INVENTORY_MANAGE', 
        'STAFF_MANAGE', 
        'ANALYSIS_VIEW', 
        'MENU_MANAGE', 
        'SETTINGS_MANAGE'
    ];

    const roleData = [
        {
            role: 'ADMIN',
            permissions: allPermissions
        },
        {
            role: 'MANAGER',
            permissions: ['POS_ACCESS', 'REPORTS_VIEW', 'EVENTS_MANAGE', 'INVENTORY_MANAGE', 'ANALYSIS_VIEW']
        },
        {
            role: 'CASHIER',
            permissions: ['POS_ACCESS']
        },
        {
            role: 'WAITER',
            permissions: ['POS_ACCESS']
        },
        {
            role: 'KITCHEN',
            permissions: ['KDS_ACCESS']
        }
    ];

    console.log('Seeding granular role permissions...');

    for (const data of roleData) {
        await prisma.rolePermission.upsert({
            where: { role: data.role },
            update: { permissions: data.permissions },
            create: { role: data.role, permissions: data.permissions }
        });
        console.log(`- Seeded ${data.role}: ${data.permissions.join(', ')}`);
    }

    console.log('RBAC Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
