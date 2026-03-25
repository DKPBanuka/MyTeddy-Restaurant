import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data with sizes...');

  const category = await prisma.category.upsert({
    where: { name: 'Pizza' },
    update: {},
    create: { name: 'Pizza' }
  });

  const pizza = await prisma.product.create({
    data: {
      name: 'Margherita Pizza',
      description: 'Classic cheese and tomato pizza',
      price: 1000.0,
      type: 'FOOD',
      categoryId: category.id,
      sizes: {
        create: [
          { name: 'Small', price: 800.0 },
          { name: 'Large', price: 1500.0 }
        ]
      }
    }
  });

  console.log('Created product with sizes:', pizza.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
