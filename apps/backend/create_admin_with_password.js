const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin123', 10);
    const email = 'admin@myteddy.com';
    const pin = '0000';

    // First try to find by email
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    
    if (existingByEmail) {
        console.log('User with this email already exists. Updating it.');
        const updated = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { 
                password: password,
                role: 'ADMIN',
                pin: pin // This might fail if another user has pin 0000
            }
        });
        console.log('Admin updated:', updated);
    } else {
        // Try upsert by pin
        const admin = await prisma.user.upsert({
            where: { pin: pin },
            update: { 
                password: password,
                role: 'ADMIN',
                email: email
            },
            create: {
                name: 'Admin User',
                email: email,
                pin: pin,
                password: password,
                role: 'ADMIN'
            }
        });
        console.log('Admin created/updated via PIN:', admin);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
