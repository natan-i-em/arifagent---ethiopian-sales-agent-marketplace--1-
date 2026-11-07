import { prisma } from '../src/prisma.js';

async function main() {
  const products = await prisma.product.findMany();
  console.log(JSON.stringify(products, null, 2));
}

main().finally(() => prisma.$disconnect());
