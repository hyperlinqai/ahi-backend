import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Product details from PADMA - THE LOTUS EDIT 2026 collection document
const productUpdates = [
  {
    sku: "AHIJ126001",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 13.8,
    height: 8, // Dimensions in cm
  },
  {
    sku: "AHIJ126002",
    material: "Brass Alloy, Zirconia, 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 6.9,
    height: 6.5,
  },
  {
    sku: "AHIJ126003",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 14.85,
    height: 12,
  },
  {
    sku: "AHIJ126004",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), Rhodium Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 14.85,
    height: 12,
  },
  {
    sku: "AHIJ126005",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), Gold Color Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 49,
  },
  {
    sku: "AHIJ126006",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), Gold Color Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 34,
  },
  {
    sku: "AHIJ126007",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), Gold Color Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 50,
  },
  {
    sku: "AHIJ126008",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 33.8,
    height: 16, // 16 inches choker
  },
  {
    sku: "AHIJ126009",
    material: "Brass Alloy, Zirconia, Pearls (No Plastic), 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 17.5,
    height: 4.8,
  },
  {
    sku: "AHIJ126010",
    material: "Brass Alloy, Zirconia, Faux Pearls, 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 31.8,
    height: 6.8,
  },
  {
    sku: "AHIJ126011",
    material: "Brass Alloy, Pearls (No Plastic), 18kt Gold Plating",
    features: "Hypoallergenic, Anti-tarnish",
    weight: 5.9,
    height: 2.3,
  },
];

async function updateProducts() {
  console.log("Starting product details update...\n");

  for (const update of productUpdates) {
    // Find variant by SKU to get productId
    const variant = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.sku, update.sku),
    });

    if (!variant) {
      console.log(`  [SKIP] No variant found with SKU: ${update.sku}`);
      continue;
    }

    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, variant.productId),
    });

    if (!product) {
      console.log(`  [SKIP] No product found for variant SKU: ${update.sku}`);
      continue;
    }

    const updateData: Record<string, any> = {
      material: update.material,
      features: update.features,
      updatedAt: new Date(),
    };

    if (update.weight) updateData.weight = update.weight;
    if (update.height) updateData.height = update.height;

    await db
      .update(schema.products)
      .set(updateData)
      .where(eq(schema.products.id, product.id));

    console.log(`  [OK] Updated: ${product.title} (${update.sku})`);
  }

  console.log("\nProduct details update complete!");
  await pool.end();
}

updateProducts().catch((err) => {
  console.error("Error updating products:", err);
  pool.end();
  process.exit(1);
});
