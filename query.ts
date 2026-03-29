import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany();
  console.log("Categories:", JSON.stringify(categories, null, 2));
  const product = await prisma.product.findFirst({ include: { images: true, category: true } });
  console.log("Sample Product:", JSON.stringify(product, null, 2));
  const banners = await prisma.banner.findMany();
  console.log("Banners:", JSON.stringify(banners, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
