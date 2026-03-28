
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.product.findFirst({ where: { name: 'Teddy Bear Small' } });
  console.log(JSON.stringify(p, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
