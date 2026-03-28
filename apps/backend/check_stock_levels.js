const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Retail Stock ---');
  const retail = await prisma.retailStock.findMany({ include: { product: true } });
  retail.forEach(s => {
    console.log(`${s.product.name}: ${s.stockQty}`);
  });

  console.log('\n--- Ingredient Stock ---');
  const ingredients = await prisma.ingredient.findMany();
  ingredients.forEach(i => {
    console.log(`${i.name}: ${i.stockQty} ${i.unitOfMeasure}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
