import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const categories = await prisma.category.findMany({ include: { children: true } });
  console.log("Categories:", JSON.stringify(categories, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
