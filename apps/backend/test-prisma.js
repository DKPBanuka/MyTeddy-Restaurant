const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma Customer model...');
    console.log('Prisma keys:', Object.keys(prisma));
    const count = await prisma.customer.count();
    console.log('Customer count:', count);
    const customers = await prisma.customer.findMany();
    console.log('Customers found:', customers.length);
  } catch (err) {
    console.error('Prisma test failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
