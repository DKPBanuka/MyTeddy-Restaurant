
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: {
      retailStock: true,
      recipeBOMs: true
    }
  });
  
  const issues = products.filter(p => {
    if (p.type === 'RETAIL' && !p.retailStock) return true;
    if (p.type === 'FOOD' && p.recipeBOMs.length === 0) return false; // Allowed? Let's check.
    return false;
  });
  
  console.log('--- Products with missing stock records ---');
  issues.forEach(p => console.log(`${p.name} (${p.type}): Missing stock record`));
  
  const foodWithoutBOM = products.filter(p => p.type === 'FOOD' && p.recipeBOMs.length === 0);
  console.log('\n--- Food Products without BOM ---');
  foodWithoutBOM.forEach(p => console.log(`${p.name}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
