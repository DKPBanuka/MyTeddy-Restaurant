import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    // Set event to 45 minutes from now to trigger the "1 hour" alert
    const eventTime = new Date(now.getTime() + 45 * 60000);
    
    const startTime = `${eventTime.getHours().toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}`;
    const endTime = `${(eventTime.getHours() + 2).toString().padStart(2, '0')}:${eventTime.getMinutes().toString().padStart(2, '0')}`;

    console.log(`Creating test party for: ${eventTime.toISOString()} (${startTime})`);

    const admin: any = await prisma.$queryRawUnsafe(`SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1`);
    if (!admin || admin.length === 0) {
        console.error('No admin user found to link booking.');
        return;
    }

    try {
        await prisma.partyBooking.create({
            data: {
                customerName: 'Test Party Alert',
                customerPhone: '0712345678',
                eventDate: eventTime,
                startTime: startTime,
                endTime: endTime,
                guestCount: 20,
                menuTotal: 15000,
                totalAmount: 18000,
                advancePaid: 5000,
                bookingType: 'PARTIAL',
                status: 'CONFIRMED'
            }
        });
        console.log('✅ Success: Test party created for alert verification.');
    } catch (e: any) {
        console.error('❌ Error creating party:', e.message);
    }
}

main().finally(() => prisma.$disconnect());
