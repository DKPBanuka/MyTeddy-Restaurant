
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ingredients = await prisma.ingredient.findMany();
  const retailStock = await prisma.retailStock.findMany({ include: { product: true } });
  
  console.log('--- Ingredients ---');
  ingredients.forEach(i => console.log(`${i.name}: ${i.stockQty}`));
  
  console.log('\n--- Retail Stock ---');
  retailStock.forEach(s => console.log(`${s.product.name}: ${s.stockQty}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
