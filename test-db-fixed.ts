import { prisma } from './src/prisma/index';

async function main() {
  try {
    const p = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        variants: {
          select: {
            id: true,
            name: true,
            value: true,
            sku: true,
            stock: true,
            lowStockAlert: true,
          }
        }
      }
    });

    console.log("Products count: ", p.length);
    console.log("Products: ", JSON.stringify(p, null, 2));
  } catch(e) {
    console.error("Prisma Error:", e);
  } finally {
    // Gracefully exit connection
    process.exit(0);
  }
}

main().catch(console.error);
