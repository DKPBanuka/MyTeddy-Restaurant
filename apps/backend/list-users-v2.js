const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            pin: true,
            createdAt: true
        }
    });
    console.log('--- USER LIST ---');
    users.forEach(u => {
        console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | PIN: ${u.pin} | Email: ${u.email}`);
    });
    
    console.log('\n--- ROLE PERMISSIONS ---');
    const perms = await prisma.rolePermission.findMany();
    perms.forEach(p => {
        console.log(`Role: ${p.role} | Permissions: ${p.permissions.join(', ')}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
