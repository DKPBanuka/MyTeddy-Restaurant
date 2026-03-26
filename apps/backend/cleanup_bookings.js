const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up invalid customer IDs in PartyBooking...');
  const result = await prisma.partyBooking.updateMany({
    where: {
      customerId: 'WALK_IN',
    },
    data: {
      customerId: null,
    },
  });
  console.log(`Updated ${result.count} bookings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
