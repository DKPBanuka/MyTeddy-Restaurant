const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

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
    let output = '--- USER LIST ---\n';
    users.forEach(u => {
        output += `ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | PIN: ${u.pin} | Email: ${u.email}\n`;
    });
    
    output += '\n--- ROLE PERMISSIONS ---\n';
    const perms = await prisma.rolePermission.findMany();
    perms.forEach(p => {
        output += `Role: ${p.role} | Permissions: ${p.permissions.join(', ')}\n`;
    });
    
    fs.writeFileSync('user-report.txt', output);
    console.log('Report written to user-report.txt');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
