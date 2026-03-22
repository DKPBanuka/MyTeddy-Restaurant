import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sandbox data for testing...');

  // 1. Create a Category
  const category = await prisma.category.upsert({
    where: { name: 'Beverages' },
    update: {},
    create: { name: 'Beverages' }
  });

  const category2 = await prisma.category.upsert({
    where: { name: 'Main Course' },
    update: {},
    create: { name: 'Main Course' }
  });

  // 2. Create the Retail product
  const p1 = await prisma.product.findUnique({ where: { id: '8c55617a-6e5b-4337-88f5-436ce679f20a' } });
  if (!p1) {
    await prisma.product.create({
      data: {
        id: '8c55617a-6e5b-4337-88f5-436ce679f20a',
        name: 'Legacy Cart Item (Retail)',
        price: 150.00,
        type: 'RETAIL',
        categoryId: category.id,
        retailStock: {
          create: {
            stockQty: 5000,
            supplierDetails: 'Mock Supplier'
          }
        }
      }
    });
  }

  // 3. Create a Cashier User
  const cashier = await prisma.user.upsert({
    where: { pin: '1111' },
    update: {},
    create: {
      name: 'Test Cashier',
      pin: '1111',
      role: Role.CASHIER,
      email: 'cashier@test.com'
    }
  });

  // 4. Create an Admin User
  const admin = await prisma.user.upsert({
    where: { pin: '9999' },
    update: {},
    create: {
      name: 'Test Admin',
      pin: '9999',
      role: Role.ADMIN,
      email: 'admin@test.com'
    }
  });

  console.log('Successfully seeded Users and Products!');
}

main().catch(e => {
  console.error('Error seeding:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
