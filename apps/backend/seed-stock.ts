import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding retail stock...');
  const retailProducts = await prisma.product.findMany({
    where: { type: 'RETAIL' },
    include: { retailStock: true }
  });

  let createdCount = 0;
  for (const product of retailProducts) {
    if (!product.retailStock) {
      await prisma.retailStock.create({
        data: {
          productId: product.id,
          stockQty: 10000,
          supplierDetails: 'Seeded Test Supplier',
        }
      });
      createdCount++;
    } else {
      await prisma.retailStock.update({
        where: { productId: product.id },
        data: { stockQty: 10000 }
      });
    }
  }

  const ingredients = await prisma.ingredient.updateMany({
    data: { stockQty: 10000 }
  });
  
  console.log(`Seeded or updated stock for ${retailProducts.length} retail products. Created ${createdCount} new stock entries.`);
  console.log(`Seeded ${ingredients.count} ingredient stocks to 10000.`);
}

main().catch(e => {
  console.error('Error seeding:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
